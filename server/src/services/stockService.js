const { sequelize, Inventory, AuditLog, StockMovement } = require('../models');
const { getIO } = require('../utils/socket');
const { runThresholdCheck } = require('../utils/cron');

class StockService {
  /**
   * Transfer stock between sites with ACID transaction
   */
  static async transferStock(fromSiteId, toSiteId, materialId, quantity, userId) {
    const t = await sequelize.transaction();

    try {
      // 1. Decrease stock from source site
      const sourceInventory = await Inventory.findOne({
        where: { siteId: fromSiteId, materialId },
        transaction: t,
        lock: t.LOCK.UPDATE // Prevent race conditions
      });

      if (!sourceInventory || sourceInventory.stock < quantity) {
        throw new Error('Stok di lokasi asal tidak mencukupi');
      }

      sourceInventory.stock -= quantity;
      await sourceInventory.save({ transaction: t });

      // 2. Increase stock at destination site
      let destInventory = await Inventory.findOne({
        where: { siteId: toSiteId, materialId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (destInventory) {
        destInventory.stock += quantity;
        await destInventory.save({ transaction: t });
      } else {
        destInventory = await Inventory.create({
          siteId: toSiteId,
          materialId,
          stock: quantity
        }, { transaction: t });
      }

      await StockMovement.create({
        materialId,
        siteId: fromSiteId,
        userId,
        type: 'TRANSFER_OUT',
        quantity,
        referenceType: 'TRANSFER',
        referenceId: null
      }, { transaction: t });

      await StockMovement.create({
        materialId,
        siteId: toSiteId,
        userId,
        type: 'TRANSFER_IN',
        quantity,
        referenceType: 'TRANSFER',
        referenceId: null
      }, { transaction: t });

      // 3. Log the transaction (Audit Trail)
      await AuditLog.create({
        userId,
        action: 'STOCK_TRANSFER',
        details: `Transfer ${quantity} unit material ID ${materialId} dari Site ${fromSiteId} ke Site ${toSiteId}`,
      }, { transaction: t });

      await t.commit();
      const io = getIO();
      io.emit('inventory_updated', {
        materialId,
        fromSiteId,
        toSiteId,
        quantity,
        type: 'TRANSFER'
      });
      runThresholdCheck().catch(() => {});
      return { success: true };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Update stock directly (e.g., initial stock or adjustment)
   */
  static async updateStock(siteId, materialId, adjustment, userId) {
    const t = await sequelize.transaction();

    try {
      let inventory = await Inventory.findOne({
        where: { siteId, materialId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!inventory) {
        inventory = await Inventory.create({
          siteId,
          materialId,
          stock: 0
        }, { transaction: t });
      }

      inventory.stock += adjustment;
      
      if (inventory.stock < 0) throw new Error('Stok tidak boleh negatif');
      
      await inventory.save({ transaction: t });

      await StockMovement.create({
        materialId,
        siteId,
        userId,
        type: adjustment >= 0 ? 'IN' : 'OUT',
        quantity: Math.abs(adjustment),
        referenceType: 'ADJUSTMENT',
        referenceId: null
      }, { transaction: t });

      await AuditLog.create({
        userId,
        action: 'STOCK_ADJUSTMENT',
        details: `Adjustment stok ${adjustment} unit untuk material ID ${materialId} di Site ${siteId}`,
      }, { transaction: t });

      await t.commit();
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
      await t.rollback();
      throw error;
    }
  }
}

module.exports = StockService;
