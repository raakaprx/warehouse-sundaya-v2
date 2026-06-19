const { ExecutiveNote } = require('../server/src/models');

async function checkSchema() {
    try {
        const attributes = ExecutiveNote.rawAttributes;
        console.log('Model Attributes:', Object.keys(attributes));
        
        const count = await ExecutiveNote.count();
        console.log('Note count:', count);
    } catch (err) {
        console.error('Schema Error:', err.message);
    } finally {
        process.exit();
    }
}

checkSchema();
