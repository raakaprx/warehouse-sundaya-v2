const bcrypt = require('bcryptjs');
const { sequelize, User, Site, Material, Inventory, MaterialRequest, MaterialRequestItem } = require('../models');

const seed = async () => {
  try {
    await sequelize.sync({ force: true });

    // Sites
    const pusat = await Site.create({ name: 'Pusat', location: 'Jakarta' });
    const papua = await Site.create({ name: 'Papua', location: 'Jayapura' });
    const maluku = await Site.create({ name: 'Maluku', location: 'Ambon' });

    // Users
    const hashedPw = await bcrypt.hash('admin123', 10);
    const commonEmail = 'faerlyroot@gmail.com';

    await User.create({ username: 'gm_admin', password: hashedPw, role: 'GM', email: commonEmail });
    await User.create({ username: 'noc', password: hashedPw, role: 'NOC', email: commonEmail });
    await User.create({ username: 'om', password: hashedPw, role: 'OM', email: commonEmail }); // Single OM user for multi-site
    await User.create({ username: 'progammer', password: hashedPw, role: 'PROGRAMMER', email: commonEmail });
    await User.create({ username: 'programmer', password: hashedPw, role: 'PROGRAMMER', email: commonEmail }); // Alias with common spelling

    // Materials
    const shs = await Material.create({
      sku: 'SDY-SHS-50W',
      name: 'Solar Home System 50W',
      category: 'Solar Kit',
      specs: '50W Panel, 12V Battery',
      image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=200&h=200&fit=crop'
    });
    const battery = await Material.create({
      sku: 'SDY-BAT-12V',
      name: 'Battery 12V 100Ah',
      category: 'Battery',
      specs: 'Deep Cycle Lead Acid',
      image: 'https://images.unsplash.com/photo-1617788131756-1229b0788734?w=200&h=200&fit=crop'
    });
    const panel100 = await Material.create({
      sku: 'SDY-PNL-100W',
      name: 'Solar Panel 100W',
      category: 'Solar Panel',
      specs: 'Monocrystalline, 100W',
      image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=200&h=200&fit=crop'
    });
    const inverter = await Material.create({
      sku: 'SDY-INV-1000W',
      name: 'Inverter 1000W',
      category: 'Inverter',
      specs: 'Pure Sine Wave, 12V to 220V',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=200&fit=crop'
    });
    const controller = await Material.create({
      sku: 'SDY-CTRL-20A',
      name: 'Charge Controller 20A',
      category: 'Controller',
      specs: 'PWM, 12V/24V Auto',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&h=200&fit=crop'
    });
    const lamp = await Material.create({
      sku: 'SDY-LMP-10W',
      name: 'LED Lamp 10W',
      category: 'Lighting',
      specs: 'E27, Warm White',
      image: 'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=200&h=200&fit=crop'
    });
    const cable = await Material.create({
      sku: 'SDY-CBL-10M',
      name: 'Solar Cable 10m',
      category: 'Accessory',
      specs: '4mm2, UV Resistant',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&h=200&fit=crop'
    });

    // Inventory
    await Inventory.create({ siteId: pusat.id, materialId: shs.id, stock: 100, minThreshold: 20 });
    await Inventory.create({ siteId: papua.id, materialId: shs.id, stock: 15, minThreshold: 10 });
    await Inventory.create({ siteId: maluku.id, materialId: shs.id, stock: 8, minThreshold: 10 });
    await Inventory.create({ siteId: pusat.id, materialId: battery.id, stock: 50, minThreshold: 10 });
    await Inventory.create({ siteId: pusat.id, materialId: panel100.id, stock: 80, minThreshold: 20 });
    await Inventory.create({ siteId: papua.id, materialId: panel100.id, stock: 12, minThreshold: 10 });
    await Inventory.create({ siteId: maluku.id, materialId: panel100.id, stock: 9, minThreshold: 10 });
    await Inventory.create({ siteId: pusat.id, materialId: inverter.id, stock: 25, minThreshold: 5 });
    await Inventory.create({ siteId: papua.id, materialId: inverter.id, stock: 6, minThreshold: 5 });
    await Inventory.create({ siteId: maluku.id, materialId: inverter.id, stock: 4, minThreshold: 5 });
    await Inventory.create({ siteId: pusat.id, materialId: controller.id, stock: 60, minThreshold: 15 });
    await Inventory.create({ siteId: papua.id, materialId: controller.id, stock: 10, minThreshold: 8 });
    await Inventory.create({ siteId: maluku.id, materialId: controller.id, stock: 7, minThreshold: 8 });
    await Inventory.create({ siteId: pusat.id, materialId: lamp.id, stock: 200, minThreshold: 30 });
    await Inventory.create({ siteId: papua.id, materialId: lamp.id, stock: 40, minThreshold: 20 });
    await Inventory.create({ siteId: maluku.id, materialId: lamp.id, stock: 35, minThreshold: 20 });
    await Inventory.create({ siteId: pusat.id, materialId: cable.id, stock: 150, minThreshold: 25 });
    await Inventory.create({ siteId: papua.id, materialId: cable.id, stock: 30, minThreshold: 15 });
    await Inventory.create({ siteId: maluku.id, materialId: cable.id, stock: 25, minThreshold: 15 });

    // Dummy Material Requests (10 data for flow visualization)
    const requests = [
      { siteId: papua.id, items: [{ materialId: shs.id, quantity: 5 }], status: 'PENDING', requesterId: 3, project: 'Papua Solar Phase 1', description: 'Urgent need for new installation' },
      { siteId: maluku.id, items: [{ materialId: battery.id, quantity: 10 }], status: 'REVIEWED_BY_NOC', requesterId: 3, project: 'Maluku Power Up', description: 'Replacement for damaged units' },
      { siteId: papua.id, items: [{ materialId: battery.id, quantity: 2 }], status: 'APPROVED_BY_GM', requesterId: 3, project: 'Jayapura School Project', description: 'Small school electrification' },
      { siteId: maluku.id, items: [{ materialId: shs.id, quantity: 20 }], status: 'APPROVED_READY_TO_SHIP', requesterId: 3, project: 'Ambon Street Lights', description: 'Public facility maintenance' },
      { siteId: papua.id, items: [{ materialId: shs.id, quantity: 15 }], status: 'ON_DELIVERY', requesterId: 3, project: 'Merauke Rural Power', description: 'Remote area distribution', trackingNumber: 'TRK-99001122', shippingPhoto: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400' },
      { siteId: maluku.id, items: [{ materialId: battery.id, quantity: 8 }], status: 'FULFILLED', requesterId: 3, project: 'Ternate Backup System', description: 'Office backup upgrade' },
      { siteId: papua.id, items: [{ materialId: shs.id, quantity: 3 }], status: 'REJECTED', requesterId: 3, project: 'Test Request', description: 'Invalid project code' },
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
          quantity: item.quantity
        })));
      }
    }

    console.log('Database seeded successfully with 10 dummy requests');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

module.exports = seed;
