import { Server, Socket } from 'socket.io'
import { saveToDatabase, getFromDatabase } from '../db/spreadsheetDb' // 데이터베이스 함수

interface WorkspaceSpreadsheet {
    data: any[]
    version: number
    lastModified: number
    lastModifiedBy: string
}

const workspaceData = new Map<string, WorkspaceSpreadsheet>()

export function setupSpreadsheetHandler(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('👤 User connected:', socket.id)

        // 스프레드시트 조회 (초기 데이터)
        socket.on('getSpreadsheet', async (data: any) => {
            const { workspaceId, username } = data
            
            if (!workspaceData.has(workspaceId)) {
                // DB에서 데이터 로드
                const dbData = await getFromDatabase('spreadsheet', workspaceId)
                
                workspaceData.set(workspaceId, {
                    data: dbData?.data || [{
                        name: 'Sheet1',
                        celldata: [],
                        row: 50,
                        column: 26,
                    }],
                    version: dbData?.version || 0,
                    lastModified: dbData?.lastModified || Date.now(),
                    lastModifiedBy: dbData?.lastModifiedBy || 'system'
                })
            }

            const spreadsheet = workspaceData.get(workspaceId)!
            
            // 사용자를 워크스페이스 그룹에 추가
            socket.join(`workspace:${workspaceId}`)
            socket.data.workspaceId = workspaceId
            socket.data.username = username
            
            // 초기 데이터 전송
            socket.emit('spreadsheetInitial', {
                data: spreadsheet.data,
                version: spreadsheet.version
            })
            
            console.log(`✅ User ${username} joined workspace: ${workspaceId}`)
        })

        // 스프레드시트 업데이트
        socket.on('updateSpreadsheet', async (data: any) => {
            const { workspaceId, celldata, version } = data
            
            if (!workspaceData.has(workspaceId)) {
                socket.emit('syncError', { message: 'Workspace not found' })
                return
            }

            const spreadsheet = workspaceData.get(workspaceId)!
            const username = socket.data.username || 'unknown'

            // 버전 검증 (중요: 충돌 감지)
            if (version !== spreadsheet.version + 1) {
                console.warn('⚠️ Version mismatch:', {
                    received: version,
                    current: spreadsheet.version
                })
                
                // 버전 불일치 알림
                socket.emit('versionMismatch', {
                    currentVersion: spreadsheet.version,
                    receivedVersion: version
                })
                return
            }

            // 데이터 업데이트
            spreadsheet.data[0].celldata = celldata
            spreadsheet.version += 1
            spreadsheet.lastModified = Date.now()
            spreadsheet.lastModifiedBy = username

            console.log(`📝 Spreadsheet updated (v${spreadsheet.version}) by ${username}`)

            // DB에 저장 (비동기)
            await saveToDatabase('spreadsheet', workspaceId, {
                data: spreadsheet.data,
                version: spreadsheet.version,
                lastModified: spreadsheet.lastModified,
                lastModifiedBy: username
            })

            // 해당 워크스페이스의 모든 클라이언트에 브로드캐스트
            io.to(`workspace:${workspaceId}`)
                .emit('spreadsheetChanged', {
                    celldata,
                    version: spreadsheet.version,
                    userId: username,
                    timestamp: Date.now()
                })
        })

        socket.on('disconnect', () => {
            console.log('👤 User disconnected:', socket.id)
        })
    })
}

export function initSpreadsheetData(io: Server) {
    // 시작 시 데이터 초기화
    console.log('📊 Initializing spreadsheet data...')
}