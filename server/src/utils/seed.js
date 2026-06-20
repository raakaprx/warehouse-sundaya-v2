const bcrypt = require('bcryptjs');
const { sequelize, User, Site, Material, Inventory, MaterialRequest, MaterialRequestItem, AuditLog } = require('../models');

const seed = async () => {
  try {
    // JANGAN gunakan force: true karena akan menghapus semua data yang ada
    await sequelize.sync({ alter: true });

    // Sites
    const pusat = await Site.create({ name: 'Pusat', location: 'Jakarta' });
    const papua = await Site.create({ name: 'Papua', location: 'Jayapura' });
    const maluku = await Site.create({ name: 'Maluku', location: 'Ambon' });

    // Users
    const hashedPw = await bcrypt.hash('admin123', 10);
    const commonEmail = 'faerlyroot@gmail.com';

    const gm = await User.create({ username: 'gm_admin', password: hashedPw, role: 'GM', email: commonEmail });
    const noc = await User.create({ username: 'noc', password: hashedPw, role: 'NOC', email: commonEmail });
    
    // OM users associated with sites
    const om_papua = await User.create({ username: 'om', password: hashedPw, role: 'OM', email: commonEmail, siteId: papua.id });
    const om_maluku = await User.create({ username: 'admin_om', password: hashedPw, role: 'OM', email: commonEmail, siteId: maluku.id });
    const om_admin = await User.create({ username: 'admin OM', password: hashedPw, role: 'OM', email: commonEmail, siteId: maluku.id });
    
    await User.create({ username: 'progammer', password: hashedPw, role: 'PROGRAMMER', email: commonEmail });
    await User.create({ username: 'programmer', password: hashedPw, role: 'PROGRAMMER', email: commonEmail }); // Alias with common spelling

    // Materials
    const shs = await Material.create({
      sku: 'SDY-SHS-50W',
      itemCode: 'SHS-50W',
      name: 'Solar Home System 50W',
      category: 'Solar Kit',
      unit: 'Unit',
      specs: '50W Panel, 12V Battery',
      image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=200&h=200&fit=crop'
    });
    const battery = await Material.create({
      sku: 'SDY-BAT-12V',
      itemCode: 'BAT-12V',
      name: 'Battery 12V 100Ah',
      category: 'Battery',
      unit: 'Unit',
      specs: 'Deep Cycle Lead Acid',
      image: 'https://images.unsplash.com/photo-1471879832106-c7ab9e0cee23?w=200&h=200&fit=crop'
    });
    const panel100 = await Material.create({
      sku: 'SDY-PNL-100W',
      itemCode: 'PNL-100W',
      name: 'Solar Panel 100W',
      category: 'Solar Panel',
      unit: 'Unit',
      specs: 'Monocrystalline, 100W',
      image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200&h=200&fit=crop'
    });
    const inverter = await Material.create({
      sku: 'SDY-INV-1000W',
      itemCode: 'INV-1000W',
      name: 'Inverter 1000W',
      category: 'Inverter',
      unit: 'Unit',
      specs: 'Pure Sine Wave, 12V to 220V',
      image: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=200&h=200&fit=crop'
    });
    const controller = await Material.create({
      sku: 'SDY-CTRL-20A',
      itemCode: 'CTRL-20A',
      name: 'Charge Controller 20A',
      category: 'Controller',
      unit: 'Unit',
      specs: 'PWM, 12V/24V Auto',
      image: 'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=200&h=200&fit=crop'
    });
    const lamp = await Material.create({
      sku: 'SDY-LMP-10W',
      itemCode: 'LMP-10W',
      name: 'LED Lamp 10W',
      category: 'Lighting',
      unit: 'Unit',
      specs: 'E27, Warm White',
      image: 'https://images.unsplash.com/photo-1481277542470-605612bd2d61?w=200&h=200&fit=crop'
    });
    const cable = await Material.create({
      sku: 'SDY-CBL-10M',
      itemCode: 'CBL-10M',
      name: 'Solar Cable 10m',
      category: 'Accessory',
      unit: 'Roll',
      specs: '4mm2, UV Resistant',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&h=200&fit=crop'
    });

    // Inventory
    await Inventory.create({ siteId: pusat.id, materialId: shs.id, stock: 100, minThreshold: 20, warningThreshold: 20, criticalThreshold: 10 });
    await Inventory.create({ siteId: papua.id, materialId: shs.id, stock: 15, minThreshold: 10, warningThreshold: 20, criticalThreshold: 10 });
    await Inventory.create({ siteId: maluku.id, materialId: shs.id, stock: 8, minThreshold: 10, warningThreshold: 20, criticalThreshold: 10 });
    await Inventory.create({ siteId: pusat.id, materialId: battery.id, stock: 50, minThreshold: 10, warningThreshold: 20, criticalThreshold: 10 });
    await Inventory.create({ siteId: pusat.id, materialId: panel100.id, stock: 80, minThreshold: 20, warningThreshold: 20, criticalThreshold: 10 });
    await Inventory.create({ siteId: papua.id, materialId: panel100.id, stock: 12, minThreshold: 10, warningThreshold: 20, criticalThreshold: 10 });
    await Inventory.create({ siteId: maluku.id, materialId: panel100.id, stock: 9, minThreshold: 10, warningThreshold: 20, criticalThreshold: 10 });
    await Inventory.create({ siteId: pusat.id, materialId: inverter.id, stock: 25, minThreshold: 5, warningThreshold: 5, criticalThreshold: 2 });
    await Inventory.create({ siteId: papua.id, materialId: inverter.id, stock: 6, minThreshold: 5, warningThreshold: 5, criticalThreshold: 2 });
    await Inventory.create({ siteId: maluku.id, materialId: inverter.id, stock: 4, minThreshold: 5, warningThreshold: 5, criticalThreshold: 2 });
    await Inventory.create({ siteId: pusat.id, materialId: controller.id, stock: 60, minThreshold: 15, warningThreshold: 15, criticalThreshold: 8 });
    await Inventory.create({ siteId: papua.id, materialId: controller.id, stock: 10, minThreshold: 8, warningThreshold: 15, criticalThreshold: 8 });
    await Inventory.create({ siteId: maluku.id, materialId: controller.id, stock: 7, minThreshold: 8, warningThreshold: 15, criticalThreshold: 8 });
    await Inventory.create({ siteId: pusat.id, materialId: lamp.id, stock: 200, minThreshold: 30, warningThreshold: 30, criticalThreshold: 15 });
    await Inventory.create({ siteId: papua.id, materialId: lamp.id, stock: 40, minThreshold: 20, warningThreshold: 30, criticalThreshold: 15 });
    await Inventory.create({ siteId: maluku.id, materialId: lamp.id, stock: 35, minThreshold: 20, warningThreshold: 30, criticalThreshold: 15 });
    await Inventory.create({ siteId: pusat.id, materialId: cable.id, stock: 150, minThreshold: 25, warningThreshold: 25, criticalThreshold: 12 });
    await Inventory.create({ siteId: papua.id, materialId: cable.id, stock: 30, minThreshold: 15, warningThreshold: 25, criticalThreshold: 12 });
    await Inventory.create({ siteId: maluku.id, materialId: cable.id, stock: 25, minThreshold: 15, warningThreshold: 25, criticalThreshold: 12 });

    // Dummy Material Requests (10 data for flow visualization)
    const requests = [
      { siteId: papua.id, items: [{ materialId: shs.id, quantity: 5 }], status: 'PENDING', requesterId: 3, project: 'Papua Solar Phase 1', description: 'Urgent need for new installation' },
      { siteId: maluku.id, items: [{ materialId: battery.id, quantity: 10 }], status: 'REVIEWED_BY_NOC', requesterId: 3, project: 'Maluku Power Up', description: 'Replacement for damaged units' },
      { siteId: papua.id, items: [{ materialId: battery.id, quantity: 2 }], status: 'APPROVED_BY_GM', requesterId: 3, project: 'Jayapura School Project', description: 'Small school electrification' },
      { siteId: maluku.id, items: [{ materialId: shs.id, quantity: 20 }], status: 'APPROVED_READY_TO_SHIP', requesterId: 3, project: 'Ambon Street Lights', description: 'Public facility maintenance' },
      { siteId: papua.id, items: [{ materialId: shs.id, quantity: 15 }], status: 'ON_DELIVERY', requesterId: 3, project: 'Merauke Rural Power', description: 'Remote area distribution', trackingNumber: 'TRK-99001122', shippingPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400' },
      { siteId: maluku.id, items: [{ materialId: battery.id, quantity: 8 }], status: 'FULFILLED', requesterId: 3, project: 'Ternate Backup System', description: 'Office backup upgrade' },
      { siteId: papua.id, items: [{ materialId: shs.id, quantity: 3 }], status: 'REJECTED_BY_NOC', requesterId: 3, project: 'Test Request', description: 'Invalid project code', nocDecisionNote: 'Kode proyek tidak valid' },
      { siteId: maluku.id, items: [{ materialId: shs.id, quantity: 12 }], status: 'PENDING', requesterId: 3, project: 'Banda Neira Lights', description: 'Tourism spot electrification' },
      { siteId: papua.id, items: [{ materialId: battery.id, quantity: 25 }], status: 'REVIEWED_BY_NOC', requesterId: 3, project: 'Mining Site A', description: 'Heavy duty battery replacement' },
      { siteId: maluku.id, items: [{ materialId: shs.id, quantity: 7 }], status: 'APPROVED_BY_GM', requesterId: 3, project: 'Village Electrification', description: 'Grant project Maluku' }
    ];

    for (const reqData of requests) {
      const { items, ...payload } = reqData;
      const created = await MaterialRequest.create(payload);
      if (items && items.length > 0) {
        await MaterialRequestItem.bulkCreate(items.map((item) => ({
          requestId: created.id,
          materialId: item.materialId,
          quantity: item.quantity,
          unit: 'Unit'
        })));
      }
    }

    // Audit Logs
    await AuditLog.bulkCreate([
      { userId: gm.id, action: 'LOGIN', module: 'AUTH', details: 'GM login to dashboard', timestamp: new Date(Date.now() - 3600000) },
      { userId: noc.id, action: 'CREATE', module: 'INVENTORY', details: 'Added new material: Solar Panel 100W', timestamp: new Date(Date.now() - 7200000) },
      { userId: om_papua.id, action: 'UPDATE', module: 'REQUEST', details: 'Updated status for Papua Solar Phase 1 to PENDING', timestamp: new Date(Date.now() - 10800000) },
      { userId: noc.id, action: 'DELETE', module: 'INVENTORY', details: 'Removed obsolete item: Old Battery model', timestamp: new Date(Date.now() - 14400000) },
      { userId: om_maluku.id, action: 'LOGIN', module: 'AUTH', details: 'OM Maluku login to dashboard', timestamp: new Date(Date.now() - 18000000) }
    ]);

    console.log('Database seeded successfully with dummy data and audit logs');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

module.exports = seed;
