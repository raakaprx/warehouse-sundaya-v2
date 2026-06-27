require("dotenv").config();

const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

// Import model Sequelize (MySQL)
const {
    sequelize,
    User,
    Site,
    Material,
    Inventory,
    MaterialRequest,
    MaterialRequestItem,
    UsedMaterialReport,
    StockMovement,
    Alert,
    Notification,
    ExecutiveNote,
    AlertTimeline,
    AuditLog
} = require("../models");

async function connectSQLite() {
    return await open({
        filename: path.join(__dirname, "../../database.sqlite"),
        driver: sqlite3.Database
    });
}

async function migrateData() {

    const sqliteDB = await connectSQLite();

    try {

        // Matikan sementara pengecekan foreign key
        await sequelize.query("SET FOREIGN_KEY_CHECKS = 0;");

        const tables = [
            { sqlite: "Sites", model: Site },
            { sqlite: "Users", model: User },
            { sqlite: "Materials", model: Material },
            { sqlite: "Inventories", model: Inventory },
            { sqlite: "MaterialRequests", model: MaterialRequest },
            { sqlite: "MaterialRequestItems", model: MaterialRequestItem },
            { sqlite: "used_material_reports", model: UsedMaterialReport },
            { sqlite: "stock_movements", model: StockMovement },
            { sqlite: "alerts", model: Alert },
            { sqlite: "notifications", model: Notification },
            { sqlite: "executive_notes", model: ExecutiveNote },
            { sqlite: "alert_timelines", model: AlertTimeline },
            { sqlite: "AuditLogs", model: AuditLog }
        ];

        for (const table of tables) {

            await migrateTable(
                sqliteDB,
                table.sqlite,
                table.model
            );

        }

        console.log("\n🎉 Semua tabel berhasil dimigrasi!");

    } finally {

        await sequelize.query("SET FOREIGN_KEY_CHECKS = 1;");
        await sqliteDB.close();

    }

}
async function migrateTable(sqliteDB, tableName, model) {

    console.log(`\n==============================`);
    console.log(`Migrating ${tableName}`);
    console.log(`==============================`);

    const rows = await sqliteDB.all(`SELECT * FROM ${tableName}`);

    console.log(`Jumlah data : ${rows.length}`);

    if (rows.length === 0) {
        console.log("Tidak ada data.");
        return;
    }

    console.log("Sample Data:");
    console.table(rows.slice(0,3));
   
    // Insert semua data
    await model.bulkCreate(rows, {
    validate: false,
    ignoreDuplicates: true
    });

    console.log(`✅ ${rows.length} data berhasil dimigrasi.`);
}

async function testConnection() {
    try {
        console.log("====================================");
        console.log("TEST KONEKSI DATABASE");
        console.log("====================================");

        // SQLite
        console.log("Menghubungkan ke SQLite...");
        const sqliteDB = await connectSQLite();
        console.log("✅ SQLite Connected");

        // MySQL
        console.log("Menghubungkan ke MySQL...");
        await sequelize.authenticate();
        console.log("✅ MySQL Connected");

        // Cek jumlah tabel SQLite
        const tables = await sqliteDB.all(`
            SELECT name
            FROM sqlite_master
            WHERE type='table'
            ORDER BY name
        `);

        console.log("\nDaftar tabel SQLite:");
        tables.forEach((table) => {
            console.log(`- ${table.name}`);
        });

        await sqliteDB.close();

        console.log("\n🎉 Semua koneksi berhasil.");

    } catch (err) {
        console.error("❌ ERROR:");
        console.error(err);
    }
}

(async()=>{

    await testConnection();

    await migrateData();

})();