const fs = require('fs');
const path = require('path');
const { readWorkbook, sheetRows } = require('./exceljsRows');

const FILE_PATH = './(구조팀) VN 스케줄표_2026.07.01(1).xlsx';
const OUTPUT_PATH = './src/data/fullScheduleSeed.ts';

if (!fs.existsSync(FILE_PATH)) {
    console.error('File not found:', FILE_PATH);
    process.exit(1);
}

(async () => {
const workbook = await readWorkbook(FILE_PATH);
const mainSheetName = workbook.worksheets.map((sheet) => sheet.name).find(name => name.includes('2026'));
const data = sheetRows(workbook.getWorksheet(mainSheetName));

function parseExcelDate(serial) {
    if (typeof serial === 'string') return null;
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
}

const monthSections = [];
for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (row && row.length > 0) {
        const firstCell = row[0];
        if (typeof firstCell === 'string' && firstCell.includes('프로젝트 진행표')) {
            monthSections.push(r);
        }
    }
}

// Data structures to fill
const generatedProjects = new Map();
const generatedTasks = [];
const generatedSchedules = [];

// Helper to normalize names
const normalizeName = (name) => name ? String(name).trim().replace(/\r\n|\n/g, ' ') : '';
const createId = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

// Parse user id from names - naive matching with our mock data
function resolveUserId(nameStr) {
    if (!nameStr) return 'unknown';
    const n = nameStr.toLowerCase();
    if (n.includes('phong')) return 'user-ly-thanh-phong';
    if (n.includes('thach')) return 'user-le-ngoc-thach';
    if (n.includes('thuy')) return 'user-ngo-thanh-thuy';
    if (n.includes('quyen')) return 'user-nguyen-thi-thanh-quyen';
    if (n.includes('tram')) return 'user-nguyen-thi-thuy-tram';
    if (n.includes('hieu')) return 'user-le-khac-hieu';
    if (n.includes('khoa')) return 'user-pham-dang-khoa';
    if (n.includes('tai')) return 'user-le-tan-tai';
    return `user-${n.replace(/[^a-z0-9]/g, '-')}`;
}

monthSections.forEach((startRow, idx) => {
    const endRow = (idx + 1 < monthSections.length) ? monthSections[idx + 1] : data.length;
    
    // Rows typically: 
    // startRow: ■ 1월 프로젝트 진행표
    // startRow + 1: Date Serial Numbers
    // startRow + 2: Days (Mon, Tue, etc)
    const dateRow = data[startRow + 1];
    if (!dateRow) return;

    // Build day map for this month
    const datesByIndex = {};
    for (let c = 2; c < dateRow.length; c++) {
        if (typeof dateRow[c] === 'number') {
            datesByIndex[c] = parseExcelDate(dateRow[c]);
        }
    }

    // Iterate over employees in this month block
    for (let r = startRow + 3; r < endRow; r += 2) {
        const employeeRow = data[r];
        const projectRow = data[r + 1];
        
        if (!employeeRow || !projectRow) continue;
        if (employeeRow[0] && String(employeeRow[0]).includes('■')) break; // Next section boundary safety
        
        const nameCell = employeeRow[3];
        if (!nameCell) continue;
        
        const employeeName = normalizeName(nameCell);
        const employeeId = resolveUserId(employeeName);
        
        let currentTask = null;

        for (let c = 2; c < employeeRow.length; c++) {
            const dateStr = datesByIndex[c];
            if (!dateStr) continue;

            let projVal = normalizeName(employeeRow[c]);
            let scopeVal = normalizeName(projectRow[c]);
            
            // Handle Off/Day
            if (projVal === 'Off' || projVal === 'Day' || projVal.toUpperCase() === 'HALF DAY' || projVal.toUpperCase() === 'HALF') {
                generatedSchedules.push({
                    id: createId('sched'),
                    userId: employeeId,
                    ownerRole: 'WORKER',
                    scheduleType: projVal === 'Off' ? 'OFF' : 'ETC',
                    title: projVal,
                    startDateTime: `${dateStr}T00:00:00Z`,
                    endDateTime: `${dateStr}T23:59:59Z`,
                    departmentId: 'dept-structure-vn',
                    isAllDay: true,
                    visibility: 'PRIVATE',
                    status: 'SCHEDULED',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                
                // Break current task
                if (currentTask) {
                    generatedTasks.push(currentTask);
                    currentTask = null;
                }
                continue;
            }

            if (!projVal || projVal === '-' || projVal === '0') {
                if (currentTask) {
                    generatedTasks.push(currentTask);
                    currentTask = null;
                }
                continue;
            }

            // Normal Project/Scope
            const projectId = `proj_${projVal.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
            if (!generatedProjects.has(projectId)) {
                generatedProjects.set(projectId, {
                    id: projectId,
                    title: projVal,
                    departmentId: 'dept-structure-vn',
                    pmId: 'user-pm-structure-vn',
                    status: 'IN_PROGRESS',
                    priority: 'NORMAL',
                    progress: 0,
                    archiveStatus: 'ACTIVE',
                    createdAt: new Date().toISOString()
                });
            }

            const titleVal = `[${scopeVal || '일반'}] ${projVal} 작업`;

            // Continue or start new task
            if (currentTask && currentTask.projectId === projectId && currentTask.title === titleVal) {
                // Extend task duration
                currentTask.dueDate = dateStr;
            } else {
                if (currentTask) generatedTasks.push(currentTask);
                
                currentTask = {
                    id: createId('task'),
                    projectId: projectId,
                    title: `[${scopeVal || '일반'}] ${projVal} 작업`,
                    description: `${employeeName} 담당 - ${projVal} (${scopeVal})`,
                    departmentId: 'dept-structure-vn',
                    assigneeId: employeeId,
                    status: 'IN_PROGRESS',
                    completionStatus: 'IN_PROGRESS',
                    priority: 'NORMAL',
                    startDate: dateStr,
                    dueDate: dateStr,
                    progress: 10,
                    orderIndex: 0,
                    approvalStatus: 'APPROVED',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            }
        }
        
        if (currentTask) {
            generatedTasks.push(currentTask);
        }
    }
});

// Post-process projects to set delivery date (+7 days from last task)
const projectsArr = Array.from(generatedProjects.values());
projectsArr.forEach(p => {
    const tasks = generatedTasks.filter(t => t.projectId === p.id);
    if (tasks.length > 0) {
        tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        const firstDate = tasks[0].startDate;
        const lastDate = tasks[tasks.length - 1].dueDate;
        
        p.startDate = firstDate;
        
        // Delivery Date = lastDate + 7 days
        const delivery = new Date(lastDate);
        delivery.setDate(delivery.getDate() + 7);
        p.deliveryDate = delivery.toISOString().split('T')[0];
    }
});

// Output code generation
const outputStr = `import { Project, TaskCard, PersonalSchedule } from '@/types/models';

export const fullProjects: Project[] = ${JSON.stringify(projectsArr, null, 2)};

export const fullTasks: TaskCard[] = ${JSON.stringify(generatedTasks, null, 2)};

export const fullSchedules: PersonalSchedule[] = ${JSON.stringify(generatedSchedules, null, 2)};
`;

fs.writeFileSync(OUTPUT_PATH, outputStr, 'utf8');
console.log(`Generated ${projectsArr.length} projects, ${generatedTasks.length} tasks, and ${generatedSchedules.length} personal schedules.`);
console.log('Saved to', OUTPUT_PATH);
})().catch((error) => { console.error(error); process.exitCode = 1; });
