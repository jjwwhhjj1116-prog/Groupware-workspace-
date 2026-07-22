const fs = require('fs');
const path = require('path');
const { readWorkbook, sheetRows } = require('./exceljsRows');

(async () => {
const workbook = await readWorkbook('(구조팀) VN 스케줄표_2026.07.01(1).xlsx');
const rows = sheetRows(workbook.getWorksheet('2026★'));

function excelDateToISO(serial) {
  if (typeof serial !== 'number') return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

function normalize(text) {
  if (!text) return '';
  return String(text).replace(/\r\n|\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
}

let startIdx = -1;
for (let i = 0; i < rows.length; i++) {
  if (rows[i][0] && String(rows[i][0]).includes('1월 프로젝트 진행표')) {
    startIdx = i;
    break;
  }
}

const dateRowIdx = startIdx + 1; 
const dateRow = rows[dateRowIdx]; 
const dates = [];
for (let c = 5; c < dateRow.length; c++) {
  const d = excelDateToISO(dateRow[c]);
  if (d) dates[c] = d;
}

const sampleDepartments = [
  { id: "dept-structure-vn", name: "VN Structure Team", description: "Vietnam structure estimation and BIM schedule team", managerId: "user-manager-structure-vn" },
  { id: "dept-slab", name: "Slab Team", description: "Slab and horizontal structure work group", managerId: "user-manager-structure-vn" },
  { id: "dept-wall", name: "Wall Team", description: "Wall and vertical structure work group", managerId: "user-manager-structure-vn" }
];

const personnelMap = new Map();
const samplePersonnelCards = [];
const sampleScheduleAssignments = [];
const samplePersonalSchedules = [];

const personalKeywords = ["off", "day", "half day", "morning", "afternoon", "vacation", "leave", "sick", "training"];
function isPersonal(text) {
  const t = normalize(text).toLowerCase();
  return personalKeywords.some(k => t.includes(k));
}

let currentTeam = '';
let currentGroup = '';

let projectRow = null;

for (let r = dateRowIdx + 2; r < rows.length; r++) {
  const row = rows[r];
  if (!row) continue;
  if (row[0] && String(row[0]).includes('2월 프로젝트 진행표')) break;

  if (row[4] === 'Project') {
    if (row[0]) currentTeam = normalize(row[0]);
    if (row[1]) currentGroup = normalize(row[1]);
    
    const position = normalize(row[2] || '');
    const name = normalize(row[3] || '');
    if (!name) continue;

    const employeeId = "user-" + name.replace(/[^a-zA-Z]/g, '').toLowerCase() || `user-${r}`;
    
    let deptId = "dept-structure-vn";
    if (currentTeam.toLowerCase().includes('slab')) deptId = "dept-slab";
    if (currentTeam.toLowerCase().includes('wall')) deptId = "dept-wall";

    if (!personnelMap.has(employeeId)) {
      const pCard = {
        id: employeeId,
        employeeNumber: `VN-${r}`,
        name: name,
        displayName: name,
        koreanAlias: name.match(/\(([^)]+)\)/)?.[1] || "",
        role: "WORKER",
        position: position,
        jobTitle: `${currentTeam} ${position}`,
        departmentId: deptId,
        teamName: currentTeam,
        groupName: currentGroup,
        managerId: "user-manager-structure-vn",
        pmId: "user-pm-structure-vn",
        employmentStatus: "ACTIVE",
        availableWorkHoursPerDay: 8,
      };
      samplePersonnelCards.push(pCard);
      personnelMap.set(employeeId, pCard);
    }
    
    projectRow = row;
  } else if (row[4] === 'Scope' && projectRow) {
    const pCard = samplePersonnelCards[samplePersonnelCards.length - 1];
    const scopeRow = row;

    for (let c = 5; c < dates.length; c++) {
      if (!dates[c]) continue;
      const rawProject = projectRow[c];
      const rawScope = scopeRow[c];
      
      if (!rawProject && !rawScope) continue;
      
      const pName = normalize(rawProject);
      const sName = normalize(rawScope);

      if (isPersonal(pName) || isPersonal(sName)) {
        samplePersonalSchedules.push({
          id: `personal-${dates[c]}-${pCard.id}-${pName}`,
          userId: pCard.id,
          ownerRole: "WORKER",
          departmentId: pCard.departmentId,
          title: pName || sName,
          description: "Excel schedule marked as Off / Day",
          scheduleType: "OFF",
          startDateTime: `${dates[c]}T09:00:00`,
          endDateTime: `${dates[c]}T18:00:00`,
          isAllDay: true,
          visibility: "MANAGER_ONLY",
          status: "SCHEDULED",
          sourceSheet: "2026★",
          sourceMonth: 1,
        });
        continue;
      }

      sampleScheduleAssignments.push({
        id: `assign-${dates[c]}-${pCard.id}-${pName.replace(/[^a-zA-Z]/g,'')}`,
        date: dates[c],
        employeeId: pCard.id,
        employeeName: pCard.displayName,
        projectId: `project-${pName.replace(/[^a-zA-Z0-9]/g,'').toLowerCase() || 'unknown'}`,
        projectName: pName,
        scopeName: sName,
        sourceSheet: "2026★",
        sourceMonth: 1,
        sourceCellType: "PROJECT_SCOPE_PAIR",
        status: "SCHEDULED"
      });
    }
    projectRow = null;
  }
}

const projectMap = new Map();
sampleScheduleAssignments.forEach(a => {
  if (!projectMap.has(a.projectId)) {
    projectMap.set(a.projectId, {
      id: a.projectId,
      title: a.projectName,
      clientName: "Unknown",
      departmentId: "dept-structure-vn",
      managerId: "user-manager-structure-vn",
      pmId: "user-pm-structure-vn",
      status: "IN_PROGRESS",
      priority: "NORMAL",
      source: "VN Schedule Excel"
    });
  }
});
const sampleProjects = Array.from(projectMap.values());

const sampleTaskCards = [];
const tasksByPersonAndProject = {};

sampleScheduleAssignments.forEach(a => {
  const key = `${a.employeeId}_${a.projectId}_${a.scopeName}`;
  if (!tasksByPersonAndProject[key]) tasksByPersonAndProject[key] = [];
  tasksByPersonAndProject[key].push(a);
});

Object.entries(tasksByPersonAndProject).forEach(([key, assignments]) => {
  assignments.sort((a,b) => a.date.localeCompare(b.date));
  
  let currentGroup = [];
  assignments.forEach((a, idx) => {
    if (currentGroup.length === 0) {
      currentGroup.push(a);
    } else {
      const prevDate = new Date(currentGroup[currentGroup.length - 1].date);
      const currDate = new Date(a.date);
      const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
      
      if (diffDays <= 3) {
        currentGroup.push(a);
      } else {
        createTaskCard(currentGroup);
        currentGroup = [a];
      }
    }
  });
  if (currentGroup.length > 0) createTaskCard(currentGroup);
});

function createTaskCard(group) {
  const a = group[0];
  const last = group[group.length - 1];
  sampleTaskCards.push({
    id: `task-${a.employeeId}-${a.projectId}-${a.date}-${last.date}`,
    projectId: a.projectId,
    title: `${a.projectName} - ${a.scopeName}`,
    description: "Generated from VN monthly schedule Excel",
    status: "IN_PROGRESS",
    priority: "NORMAL",
    assigneeId: a.employeeId,
    pmId: "user-pm-structure-vn",
    managerId: "user-manager-structure-vn",
    departmentId: "dept-structure-vn",
    startDate: a.date,
    dueDate: last.date,
    progress: 0,
    orderIndex: sampleTaskCards.length,
    approvalStatus: "APPROVED",
    sourceType: "EXCEL_SCHEDULE",
    sourceSheet: "2026★",
    sourceMonth: 1,
    sourceAssignmentIds: group.map(g => g.id)
  });
}

const outputTS = `// Auto-generated by Antigravity Phase 27
import { PersonnelCard, Project, TaskCard, PersonalSchedule, ApprovalRequest } from '@/types/models';

export const sampleDepartments = ${JSON.stringify(sampleDepartments, null, 2)};

export const samplePersonnelCards: PersonnelCard[] = ${JSON.stringify(samplePersonnelCards, null, 2)} as any;

export const sampleProjects: Project[] = ${JSON.stringify(sampleProjects, null, 2)} as any;

export const sampleScheduleAssignments = ${JSON.stringify(sampleScheduleAssignments, null, 2)};

export const samplePersonalSchedules: PersonalSchedule[] = ${JSON.stringify(samplePersonalSchedules, null, 2)} as any;

export const sampleTaskCards: TaskCard[] = ${JSON.stringify(sampleTaskCards, null, 2)} as any;

export const sampleNotifications = [];
export const sampleAuditLogs = [];
`;

fs.writeFileSync(path.join(__dirname, '../src/data/workspaceScheduleSeed.ts'), outputTS);
console.log("Successfully generated src/data/workspaceScheduleSeed.ts");
})().catch((error) => { console.error(error); process.exitCode = 1; });
