/**
 * ============================================================================
 * STOCK SERVICE - Reusable Stock Business Logic
 * ============================================================================
 * Fungsi: Mengelola logika stok yang bisa digunakan di banyak tempat.
 * Ini SERVICE, bukan controller, jadi bisa dipanggil dari berbagai controller.
 * 
 * Alasan pisahkan ke service:
 * - Clean Architecture: logika stok terisolasi di satu tempat
 * - Reusable: dipanggil dari inventoryController.updateStock() dan shipNOC()
 * - Testable: mudah unit test tanpa mock controller
 * - Maintenance: jika ada perubahan logika stok, hanya ubah di sini
 * 
 * Kedua method menggunakan transaction:
 * - transferStock: pindah stok dari lokasi A ke B (atomic)
 * - updateStock: adjust stok di satu lokasi (atomic)
 * ============================================================================
 */
const { sequelize, Inventory, AuditLog, StockMovement } = require('../models');
const { getIO } = require('../utils/socket');
const { runThresholdCheck } = require('../utils/cron');

class StockService {
  /**
   * TRANSFER STOCK: Pindahkan stok dari satu site ke site lain
   * Digunakan: shipNOC() untuk transfer Pusat → Tujuan
   * 
   * ATOMIC: Jika ada error, semua batal (rollback)
   * LOCKED: Gunakan pessimistic lock agar tidak race condition
   */
  static async transferStock(fromSiteId, toSiteId, materialId, quantity, userId) {
    const t = await sequelize.transaction();

    try {
      // ⬇️ 1) GET source inventory dengan lock
      const sourceInventory = await Inventory.findOne({
        where: { siteId: fromSiteId, materialId },
        transaction: t,
        lock: t.LOCK.UPDATE // ⬅️ Lock = jangan biarkan orang lain ubah samaan
      });

      // ⬇️ Validasi: stok harus cukup
      if (!sourceInventory || sourceInventory.stock < quantity) {
        throw new Error('Stok di lokasi asal tidak mencukupi');
      }

      // ⬇️ 2) UPDATE: kurangi stok source
      sourceInventory.stock -= quantity;
      await sourceInventory.save({ transaction: t });

      // ⬇️ 3) GET or CREATE destination inventory
      let destInventory = await Inventory.findOne({
        where: { siteId: toSiteId, materialId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (destInventory) {
        // ⬇️ Jika sudah ada, tambah stok
        destInventory.stock += quantity;
        await destInventory.save({ transaction: t });
      } else {
        // ⬇️ Jika belum ada, create baru
        destInventory = await Inventory.create({
          siteId: toSiteId,
          materialId,
          stock: quantity
        }, { transaction: t });
      }

      // ⬇️ 4) LOG: buat StockMovement untuk audit trail
      await StockMovement.create({
        materialId,
        siteId: fromSiteId,
        userId,
        type: 'TRANSFER_OUT', // ⬅️ Keluar dari source
        quantity,
        referenceType: 'TRANSFER',
        referenceId: null
      }, { transaction: t });

      await StockMovement.create({
        materialId,
        siteId: toSiteId,
        userId,
        type: 'TRANSFER_IN', // ⬅️ Masuk ke destination
        quantity,
        referenceType: 'TRANSFER',
        referenceId: null
      }, { transaction: t });

      // ⬇️ 5) AUDIT: catat siapa yang transfer apa dari mana ke mana
      await AuditLog.create({
        userId,
        action: 'STOCK_TRANSFER',
        details: `Transfer ${quantity} unit material ID ${materialId} dari Site ${fromSiteId} ke Site ${toSiteId}`,
      }, { transaction: t });

      // ⬇️ 6) COMMIT: semua berhasil
      await t.commit();
      
      // ⬇️ Emit socket agar UI refresh
      const io = getIO();
      io.emit('inventory_updated', {
        materialId,
        fromSiteId,
        toSiteId,
        quantity,
        type: 'TRANSFER'
      });
      
      // ⬇️ Check threshold: lihat apakah stok baru di bawah threshold
      runThresholdCheck().catch(() => {});
      
      return { success: true };
    } catch (error) {
      // ⬇️ ERROR: Rollback semua (atomicity)
      await t.rollback();
      throw error;
    }
  }

  /**
   * UPDATE STOCK: Adjust stok di satu lokasi
   * Digunakan: inventory page untuk adjustment/initial stock
   * 
   * adjustment > 0 = tambah stok
   * adjustment < 0 = kurangi stok
   */
  static async updateStock(siteId, materialId, adjustment, userId) {
    const t = await sequelize.transaction();

    try {
      // ⬇️ 1) GET inventory dengan lock
      let inventory = await Inventory.findOne({
        where: { siteId, materialId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!inventory) {
        // ⬇️ Jika belum ada, create baru
        inventory = await Inventory.create({
          siteId,
          materialId,
          stock: 0
        }, { transaction: t });
      }

      // ⬇️ 2) UPDATE: adjust stok
      inventory.stock += adjustment;
      
      // ⬇️ Validasi: stok tidak boleh negatif
      if (inventory.stock < 0) throw new Error('Stok tidak boleh negatif');
      
      await inventory.save({ transaction: t });

      // ⬇️ 3) LOG: buat StockMovement
      await StockMovement.create({
        materialId,
        siteId,
        userId,
        type: adjustment >= 0 ? 'IN' : 'OUT', // ⬅️ IN jika positif, OUT jika negatif
        quantity: Math.abs(adjustment),
        referenceType: 'ADJUSTMENT',
        referenceId: null
      }, { transaction: t });

      // ⬇️ 4) AUDIT: catat adjustment
      await AuditLog.create({
        userId,
        action: 'STOCK_ADJUSTMENT',
        details: `Adjustment stok ${adjustment} unit untuk material ID ${materialId} di Site ${siteId}`,
      }, { transaction: t });

      // ⬇️ 5) COMMIT
      await t.commit();
      
      // ⬇️ Emit socket + check threshold
      const io = getIO();
      io.emit('inventory_updated', {
        materialId,
        siteId,
        stock: inventory.stock,
        type: 'ADJUST'
      });
      runThresholdCheck().catch(() => {});
      
      return inventory;
    } catch (error) {
      // ⬇️ ERROR: Rollback
      await t.rollback();
      throw error;
    }
  }
}

module.exports = StockService;
