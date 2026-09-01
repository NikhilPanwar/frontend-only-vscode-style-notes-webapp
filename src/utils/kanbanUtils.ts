import {
  KanbanBoardData,
  KanbanColumn,
  KanbanPriority,
  KanbanSubtask,
  KanbanTag,
  KanbanTask,
} from '../types';

export const DEFAULT_KANBAN_COLUMNS: Omit<KanbanColumn, 'taskIds'>[] = [
  { id: 'todo', title: 'To Do', color: '#3b82f6' },
  { id: 'in_progress', title: 'In Progress', color: '#f59e0b' },
  { id: 'stalled', title: 'Stalled', color: '#a855f7' },
  { id: 'cant_be_done', title: "Can't Be Done", color: '#ef4444' },
  { id: 'done', title: 'Done', color: '#10b981' },
];

export const PRESET_TAG_COLORS: { name: string; color: string; bg: string; text: string }[] = [
  { name: 'Feature', color: '#3b82f6', bg: 'bg-blue-500/15', text: 'text-blue-400' },
  { name: 'Bug', color: '#ef4444', bg: 'bg-red-500/15', text: 'text-red-400' },
  { name: 'Frontend', color: '#06b6d4', bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  { name: 'Backend', color: '#8b5cf6', bg: 'bg-purple-500/15', text: 'text-purple-400' },
  { name: 'Design', color: '#ec4899', bg: 'bg-pink-500/15', text: 'text-pink-400' },
  { name: 'Documentation', color: '#f59e0b', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  { name: 'DevOps', color: '#64748b', bg: 'bg-slate-500/15', text: 'text-slate-400' },
  { name: 'Improvement', color: '#10b981', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
];

export const COLOR_PALETTE = [
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#84cc16', // lime
  '#f59e0b', // amber
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#6366f1', // indigo
  '#64748b', // slate
];

export function generateKanbanId(prefix = 'task'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function createCustomKanbanColumn(title = 'New Column', color = '#3b82f6'): KanbanColumn {
  return {
    id: generateKanbanId('col'),
    title: title.trim() || 'New Column',
    color: color || '#3b82f6',
    taskIds: [],
  };
}

export function createEmptyKanbanBoard(title = 'Project Board'): KanbanBoardData {
  return {
    type: 'kanban',
    version: 1,
    title,
    columns: DEFAULT_KANBAN_COLUMNS.map((col) => ({
      ...col,
      taskIds: [],
    })),
    tasks: {},
    customTags: PRESET_TAG_COLORS.map((p) => ({
      id: p.name.toLowerCase(),
      name: p.name,
      color: p.color,
    })),
  };
}

export function createDefaultKanbanBoard(title = 'Sprint Tasks & Roadmap'): KanbanBoardData {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const formatDate = (daysOffset: number) => {
    const d = new Date(now + daysOffset * ONE_DAY_MS);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const tasks: Record<string, KanbanTask> = {
    'task-1': {
      id: 'task-1',
      title: 'Design high-contrast & VS Code color themes',
      description: 'Implement dark/light themes, Solarized palettes, and Monokai with accessible contrast ratios.',
      priority: 'urgent',
      tags: ['Design', 'Frontend'],
      dueDate: formatDate(-2),
      columnId: 'done',
      createdAt: now - 3 * ONE_DAY_MS,
      updatedAt: now - 1 * ONE_DAY_MS,
      assignee: 'Alex R.',
      subtasks: [
        { id: 'sub-1', title: 'Audit WCAG AA color contrast', completed: true },
        { id: 'sub-2', title: 'Create CSS theme token mappings', completed: true },
        { id: 'sub-3', title: 'Register custom Monaco editor themes', completed: true },
      ],
    },
    'task-2': {
      id: 'task-2',
      title: 'Build interactive Kanban board with subtasks',
      description: 'Support task drag and drop, priority badges, tag color coding, and granular subtask checklists.',
      priority: 'high',
      tags: ['Feature', 'Frontend'],
      dueDate: formatDate(1),
      columnId: 'in_progress',
      createdAt: now - 2 * ONE_DAY_MS,
      updatedAt: now - 3600000,
      assignee: 'Jordan T.',
      subtasks: [
        { id: 'sub-4', title: 'Define .kanban serialization schema', completed: true },
        { id: 'sub-5', title: 'Implement HTML5 drag & drop column movements', completed: true },
        { id: 'sub-6', title: 'Add subtask progress tracking bar', completed: false },
        { id: 'sub-7', title: 'Build task details drawer modal', completed: false },
      ],
    },
    'task-3': {
      id: 'task-3',
      title: 'Optimize IndexedDB workspace cold start',
      description: 'Improve initial workspace load latency for projects with 100+ notes and diagrams.',
      priority: 'medium',
      tags: ['Improvement', 'Backend'],
      dueDate: formatDate(3),
      columnId: 'in_progress',
      createdAt: now - 1 * ONE_DAY_MS,
      updatedAt: now - 7200000,
      assignee: 'Taylor M.',
      subtasks: [
        { id: 'sub-8', title: 'Batch IDB transaction reads', completed: true },
        { id: 'sub-9', title: 'Verify memory benchmarks on 1MB notes', completed: false },
      ],
    },
    'task-4': {
      id: 'task-4',
      title: 'Implement full-text search with regex support',
      description: 'Allow fuzzy and regex search across all files in sidebar with real-time match highlighting.',
      priority: 'high',
      tags: ['Feature'],
      dueDate: formatDate(5),
      columnId: 'todo',
      createdAt: now - 1 * ONE_DAY_MS,
      updatedAt: now - 1 * ONE_DAY_MS,
      assignee: 'Alex R.',
      subtasks: [
        { id: 'sub-10', title: 'Build inverted index scanner', completed: false },
        { id: 'sub-11', title: 'Add case-sensitive and whole-word toggle options', completed: false },
      ],
    },
    'task-5': {
      id: 'task-5',
      title: 'Excalidraw PNG & SVG vector diagram export',
      description: 'Enable users to export whiteboards directly to local image files.',
      priority: 'medium',
      tags: ['Feature', 'Design'],
      dueDate: formatDate(7),
      columnId: 'todo',
      createdAt: now - 12 * 3600000,
      updatedAt: now - 12 * 3600000,
      assignee: 'Jordan T.',
      subtasks: [
        { id: 'sub-12', title: 'Render canvas to blob with transparent background', completed: false },
        { id: 'sub-13', title: 'Add export action button to header', completed: false },
      ],
    },
    'task-6': {
      id: 'task-6',
      title: 'Mobile native haptic vibration on drag',
      description: 'Vibrate device when card is dragged over drop zone. Stalled pending standard Web Vibration API permissions.',
      priority: 'low',
      tags: ['Frontend'],
      columnId: 'stalled',
      createdAt: now - 4 * ONE_DAY_MS,
      updatedAt: now - 2 * ONE_DAY_MS,
      assignee: 'Taylor M.',
      subtasks: [
        { id: 'sub-14', title: 'Test navigator.vibrate across iOS and Android browsers', completed: true },
      ],
    },
    'task-7': {
      id: 'task-7',
      title: 'Sync offline notes to proprietary Jira Cloud instance',
      description: 'Direct server-side sync to external Jira cloud. Note: Offline sandbox operates client-side without third party cloud secrets.',
      priority: 'low',
      tags: ['DevOps'],
      columnId: 'cant_be_done',
      createdAt: now - 5 * ONE_DAY_MS,
      updatedAt: now - 3 * ONE_DAY_MS,
      assignee: 'Alex R.',
      subtasks: [
        { id: 'sub-15', title: 'Document offline export workflow as alternative', completed: true },
      ],
    },
  };

  const columns: KanbanColumn[] = [
    {
      id: 'todo',
      title: 'To Do',
      color: '#3b82f6',
      taskIds: ['task-4', 'task-5'],
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      color: '#f59e0b',
      taskIds: ['task-2', 'task-3'],
    },
    {
      id: 'stalled',
      title: 'Stalled',
      color: '#a855f7',
      taskIds: ['task-6'],
    },
    {
      id: 'cant_be_done',
      title: "Can't Be Done",
      color: '#ef4444',
      taskIds: ['task-7'],
    },
    {
      id: 'done',
      title: 'Done',
      color: '#10b981',
      taskIds: ['task-1'],
    },
  ];

  return {
    type: 'kanban',
    version: 1,
    title,
    description: 'Sprint planning and backlog tracker for VS Code Notes workspace',
    columns,
    tasks,
    customTags: PRESET_TAG_COLORS.map((p) => ({
      id: p.name.toLowerCase(),
      name: p.name,
      color: p.color,
    })),
  };
}

export function parseKanbanData(content: string, fallbackTitle = 'Kanban Board'): KanbanBoardData {
  if (!content || !content.trim()) {
    return createEmptyKanbanBoard(fallbackTitle);
  }

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      // Validate or repair columns
      let columns: KanbanColumn[] = Array.isArray(parsed.columns)
        ? parsed.columns
        : DEFAULT_KANBAN_COLUMNS.map((c) => ({ ...c, taskIds: [] }));

      // Ensure every column has valid structure
      columns = columns.map((col, idx) => ({
        id: col.id || `col_${idx}`,
        title: col.title || `Column ${idx + 1}`,
        color: col.color || '#3b82f6',
        taskIds: Array.isArray(col.taskIds) ? col.taskIds : [],
      }));

      // Ensure tasks dictionary
      const tasks: Record<string, KanbanTask> = {};
      if (parsed.tasks && typeof parsed.tasks === 'object') {
        Object.entries(parsed.tasks).forEach(([id, t]: [string, any]) => {
          if (t && typeof t === 'object') {
            tasks[id] = {
              id: t.id || id,
              title: t.title || 'Untitled Task',
              description: t.description || '',
              priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority)
                ? t.priority
                : 'medium',
              tags: Array.isArray(t.tags) ? t.tags : [],
              dueDate: t.dueDate || undefined,
              subtasks: Array.isArray(t.subtasks)
                ? t.subtasks.map((s: any, sIdx: number) => ({
                    id: s.id || `sub_${sIdx}`,
                    title: s.title || '',
                    completed: Boolean(s.completed),
                  }))
                : [],
              columnId: t.columnId || columns[0].id,
              createdAt: t.createdAt || Date.now(),
              updatedAt: t.updatedAt || Date.now(),
              assignee: t.assignee || undefined,
            };
          }
        });
      }

      // Reconcile taskIds with actual tasks
      columns.forEach((col) => {
        col.taskIds = col.taskIds.filter((tId) => Boolean(tasks[tId]));
      });

      // Add any orphaned tasks to first column
      Object.keys(tasks).forEach((tId) => {
        const found = columns.some((col) => col.taskIds.includes(tId));
        if (!found && columns.length > 0) {
          columns[0].taskIds.push(tId);
          tasks[tId].columnId = columns[0].id;
        }
      });

      return {
        type: 'kanban',
        version: 1,
        title: parsed.title || fallbackTitle,
        description: parsed.description || '',
        columns,
        tasks,
        customTags: Array.isArray(parsed.customTags)
          ? parsed.customTags
          : PRESET_TAG_COLORS.map((p) => ({
              id: p.name.toLowerCase(),
              name: p.name,
              color: p.color,
            })),
      };
    }
  } catch (err) {
    console.warn('Failed to parse .kanban file JSON, generating fallback board:', err);
  }

  return createEmptyKanbanBoard(fallbackTitle);
}

export function serializeKanbanData(data: KanbanBoardData): string {
  return JSON.stringify(data, null, 2);
}

export function getPriorityMeta(priority: KanbanPriority): {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  weight: number;
} {
  switch (priority) {
    case 'urgent':
      return {
        label: 'Urgent',
        color: '#ef4444',
        bgColor: 'bg-red-500/15',
        textColor: 'text-red-600 dark:text-red-400',
        borderColor: 'border-red-500/30',
        weight: 4,
      };
    case 'high':
      return {
        label: 'High',
        color: '#f97316',
        bgColor: 'bg-orange-500/15',
        textColor: 'text-orange-600 dark:text-orange-400',
        borderColor: 'border-orange-500/30',
        weight: 3,
      };
    case 'medium':
      return {
        label: 'Medium',
        color: '#eab308',
        bgColor: 'bg-yellow-500/15',
        textColor: 'text-amber-600 dark:text-yellow-400',
        borderColor: 'border-yellow-500/30',
        weight: 2,
      };
    case 'low':
    default:
      return {
        label: 'Low',
        color: '#3b82f6',
        bgColor: 'bg-blue-500/15',
        textColor: 'text-blue-600 dark:text-blue-400',
        borderColor: 'border-blue-500/30',
        weight: 1,
      };
  }
}

export function getTagColor(tagName: string, customTags?: KanbanTag[]): string {
  if (customTags) {
    const found = customTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
    if (found) return found.color;
  }
  const preset = PRESET_TAG_COLORS.find((p) => p.name.toLowerCase() === tagName.toLowerCase());
  if (preset) return preset.color;

  // Derive stable hash color
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

export function formatDueDate(dueDate?: string): {
  text: string;
  isOverdue: boolean;
  isToday: boolean;
  isSoon: boolean;
} | null {
  if (!dueDate) return null;

  try {
    const [y, m, d] = dueDate.split('-').map(Number);
    const dueTime = new Date(y, m - 1, d, 23, 59, 59).getTime();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = `${monthNames[m - 1]} ${d}`;

    const isOverdue = dueTime < todayStart;
    const isToday = dueTime >= todayStart && dueTime <= todayEnd;
    const isSoon = dueTime > todayEnd && dueTime <= todayEnd + 2 * 24 * 60 * 60 * 1000;

    return {
      text: isToday ? 'Today' : formatted,
      isOverdue,
      isToday,
      isSoon,
    };
  } catch {
    return {
      text: dueDate,
      isOverdue: false,
      isToday: false,
      isSoon: false,
    };
  }
}

export function calculateSubtaskProgress(subtasks: KanbanSubtask[]): {
  total: number;
  completed: number;
  percent: number;
} {
  if (!subtasks || subtasks.length === 0) {
    return { total: 0, completed: 0, percent: 0 };
  }
  const completed = subtasks.filter((s) => s.completed).length;
  const total = subtasks.length;
  const percent = Math.round((completed / total) * 100);
  return { total, completed, percent };
}

export function calculateBoardStats(board: KanbanBoardData): {
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  totalSubtasks: number;
  completedSubtasks: number;
} {
  const taskList = Object.values(board.tasks);
  const totalTasks = taskList.length;

  const doneCol = board.columns.find(
    (c) => c.id === 'done' || c.title.toLowerCase().includes('done') || c.title.toLowerCase().includes('complete')
  );
  const doneColId = doneCol ? doneCol.id : 'done';

  const completedTasks = taskList.filter((t) => t.columnId === doneColId).length;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  let totalSubtasks = 0;
  let completedSubtasks = 0;
  taskList.forEach((t) => {
    t.subtasks.forEach((s) => {
      totalSubtasks++;
      if (s.completed) completedSubtasks++;
    });
  });

  return {
    totalTasks,
    completedTasks,
    completionPercent,
    totalSubtasks,
    completedSubtasks,
  };
}
