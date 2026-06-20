const { sequelize, Inventory } = require('../models');

const migrateThresholds = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Update existing inventory items to set warningThreshold and criticalThreshold
    const [updatedCount] = await Inventory.update(
      {
        warningThreshold: sequelize.literal('minThreshold'),
        criticalThreshold: sequelize.literal('CASE WHEN minThreshold > 1 THEN FLOOR(minThreshold / 2) ELSE 1 END')
      },
      {
        where: {
          warningThreshold: null
        }
      }
    );

    console.log(`✅ Updated ${updatedCount} inventory items with new thresholds.`);

    // Verify the update
    const inventories = await Inventory.findAll({ limit: 5 });
    console.log('Sample updated items:', inventories.map(inv => ({
      id: inv.id,
      minThreshold: inv.minThreshold,
      warningThreshold: inv.warningThreshold,
      criticalThreshold: inv.criticalThreshold
    })));

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateThresholds();
