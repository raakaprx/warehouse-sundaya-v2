const { 
  User, 
  Site, 
  Material, 
  MaterialRequest, 
  MaterialRequestItem, 
  Alert, 
  Inventory,
  sequelize 
} = require('./server/src/models');

async function seedDummyData() {
  console.log('--- Memulai Seeding Data Dummy untuk GM Dashboard ---');
  
  try {
    // 1. Ambil User dan Site yang ada
    const users = await User.findAll();
    const sites = await Site.findAll();
    const materials = await Material.findAll();

    if (users.length === 0 || sites.length === 0 || materials.length === 0) {
      console.error('Error: Pastikan User, Site, dan Material sudah ada di database.');
      return;
    }

    const gmUser = users.find(u => u.role === 'GM') || users[0];
    const omUser = users.find(u => u.role === 'OM') || users[0];
    const nocUser = users.find(u => u.role === 'NOC') || users[0];

    const sitePusat = sites.find(s => s.name.includes('Pusat')) || sites[0];
    const sitePapua = sites.find(s => s.name.includes('Papua')) || sites[0];
    const siteMaluku = sites.find(s => s.name.includes('Maluku')) || sites[0];

    // 2. Bersihkan Alert dan MaterialRequest lama (opsional, tapi agar bersih)
    // await Alert.destroy({ where: {} });
    // await MaterialRequest.destroy({ where: {} });

    console.log('Menghasilkan Material Requests...');

    const statuses = [
      'PENDING', 
      'REVIEWED_BY_NOC', 
      'APPROVED_BY_GM', 
      'APPROVED_READY_TO_SHIP', 
      'ON_DELIVERY', 
      'FULFILLED', 
      'REJECTED'
    ];

    // Buat 30 Material Requests acak
    for (let i = 0; i < 30; i++) {
      const targetSite = sites[Math.floor(Math.random() * sites.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const urgency = Math.random() > 0.7 ? 'CRITICAL' : 'HIGH';
      
      const req = await MaterialRequest.create({
        urgency,
        project: `Project ${['Solar', 'Wind', 'Hybrid', 'Microgrid'][Math.floor(Math.random() * 4)]} ${2024 + Math.floor(i/10)}`,
        documentNo: `DOC-${2026}${String(i).padStart(4, '0')}`,
        destination: targetSite.name,
        description: `Permintaan material dummy untuk ${targetSite.name} - Tahap ${i}`,
        status,
        requesterId: omUser.id,
        siteId: targetSite.id,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // 30 hari terakhir
      });

      // Tambahkan 1-3 item per request
      const itemCount = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < itemCount; j++) {
        const material = materials[Math.floor(Math.random() * materials.length)];
        await MaterialRequestItem.create({
          requestId: req.id,
          materialId: material.id,
          quantity: 1 + Math.floor(Math.random() * 20),
          unit: material.unit || 'pcs'
        });
      }
    }

    console.log('Menghasilkan Alerts...');

    // Buat beberapa alert stok
    const alertTypes = ['STOCK_WARNING', 'CRITICAL_STOCK', 'OUT_OF_STOCK'];
    for (let i = 0; i < 15; i++) {
      const material = materials[Math.floor(Math.random() * materials.length)];
      const site = sites[Math.floor(Math.random() * sites.length)];
      const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      
      await Alert.create({
        materialId: material.id,
        siteId: site.id,
        stock: type === 'OUT_OF_STOCK' ? 0 : 5,
        minThreshold: 10,
        shortage: type === 'OUT_OF_STOCK' ? 10 : 5,
        type,
        priority: type === 'STOCK_WARNING' ? 'WARNING' : 'CRITICAL',
        status: 'NEW',
        message: `${type.replace(/_/g, ' ')} for ${material.name} at ${site.name}`,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000)
      });
    }

    console.log('--- Seeding Selesai Berhasil ---');
  } catch (error) {
    console.error('Seeding Error:', error);
  } finally {
    process.exit();
  }
}

seedDummyData();