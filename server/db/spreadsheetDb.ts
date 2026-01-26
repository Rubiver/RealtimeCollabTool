import pool from '@/app/lib/db'

export async function getFromDatabase(type: string, workspaceId: string) {
    try {
        const [rows]: any = await pool.execute(
            'SELECT data, version, lastModified, lastModifiedBy FROM workspace_data WHERE workspaceId = ? AND type = ?',
            [workspaceId, type]
        )
        
        if (rows.length > 0) {
            return {
                data: JSON.parse(rows[0].data),
                version: rows[0].version,
                lastModified: rows[0].lastModified,
                lastModifiedBy: rows[0].lastModifiedBy
            }
        }
        return null
    } catch (error) {
        console.error('DB Error:', error)
        return null
    }
}

export async function saveToDatabase(type: string, workspaceId: string, payload: any) {
    try {
        const { data, version, lastModified, lastModifiedBy } = payload
        
        await pool.execute(
            `INSERT INTO workspace_data 
            (workspaceId, type, data, version, lastModified, lastModifiedBy)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            data = VALUES(data),
            version = VALUES(version),
            lastModified = VALUES(lastModified),
            lastModifiedBy = VALUES(lastModifiedBy)`,
            [workspaceId, type, JSON.stringify(data), version, lastModified, lastModifiedBy]
        )
    } catch (error) {
        console.error('DB Save Error:', error)
    }
}