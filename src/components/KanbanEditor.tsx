import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Tag as TagIcon,
  CheckSquare,
  Clock,
  Trash2,
  Edit2,
  MoreVertical,
  MoreHorizontal,
  ChevronRight,
  Flame,
  ArrowUp,
  Equal,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Columns,
  Download,
  Share2,
  User,
  Palette,
  AlertTriangle,
  Kanban as KanbanIcon,
  Table,
} from 'lucide-react';
import {
  KanbanBoardData,
  KanbanColumn,
  KanbanPriority,
  KanbanTask,
  ThemeType,
} from '../types';
import { THEMES } from '../utils/themes';
import {
  calculateBoardStats,
  calculateSubtaskProgress,
  COLOR_PALETTE,
  createCustomKanbanColumn,
  DEFAULT_KANBAN_COLUMNS,
  formatDueDate,
  generateKanbanId,
  getPriorityMeta,
  getTagColor,
  parseKanbanData,
  serializeKanbanData,
} from '../utils/kanbanUtils';
import { KanbanTaskModal } from './KanbanTaskModal';
import { KanbanTableView } from './KanbanTableView';

interface KanbanEditorProps {
  fileId: string;
  filename: string;
  content: string;
  currentTheme: ThemeType;
  onUpdateContent: (fileId: string, newContent: string) => void;
}

export const KanbanEditor: React.FC<KanbanEditorProps> = ({
  fileId,
  filename,
  content,
  currentTheme,
  onUpdateContent,
}) => {
  const theme = THEMES[currentTheme];

  // View Mode: Kanban Board Cards vs Sectioned Table
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

  // Parse board data
  const board: KanbanBoardData = useMemo(() => {
    return parseKanbanData(content, filename.replace(/\.kanban$/i, ''));
  }, [content, filename]);

  // Active Task Modal State
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState<string>('all');

  // Inline Quick Add Card State per Column
  const [quickAddColumnId, setQuickAddColumnId] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');

  // Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Board Title Editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [boardTitleInput, setBoardTitleInput] = useState(board.title);

  // Column Customization States
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(COLOR_PALETTE[0]);

  const [activeMenuColumnId, setActiveMenuColumnId] = useState<string | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColTitle, setEditingColTitle] = useState('');

  const [deletingColumn, setDeletingColumn] = useState<KanbanColumn | null>(null);
  const [deleteMoveTargetColId, setDeleteMoveTargetColId] = useState<string>('');
  const [showResetColumnsModal, setShowResetColumnsModal] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);

  // Close dropdown menus on global click
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMenuColumnId(null);
      setShowBoardMenu(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Save changes to file content
  const persistBoard = useCallback(
    (updatedBoard: KanbanBoardData) => {
      const json = serializeKanbanData(updatedBoard);
      onUpdateContent(fileId, json);
    },
    [fileId, onUpdateContent]
  );

  // Board stats
  const stats = useMemo(() => calculateBoardStats(board), [board]);

  // Extract all unique tags present across tasks
  const allUniqueTags = useMemo(() => {
    const set = new Set<string>();
    Object.values(board.tasks).forEach((t) => {
      t.tags.forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort();
  }, [board.tasks]);

  // Filter tasks based on search & filter controls
  const filteredTasksMap = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result: Record<string, boolean> = {};

    Object.values(board.tasks).forEach((task) => {
      let matches = true;

      // Text query
      if (q) {
        const inTitle = task.title.toLowerCase().includes(q);
        const inDesc = (task.description || '').toLowerCase().includes(q);
        const inTags = task.tags.some((t) => t.toLowerCase().includes(q));
        const inAssignee = (task.assignee || '').toLowerCase().includes(q);
        const inSubtasks = task.subtasks.some((s) => s.title.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTags && !inAssignee && !inSubtasks) {
          matches = false;
        }
      }

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        matches = false;
      }

      // Tag filter
      if (tagFilter !== 'all' && !task.tags.includes(tagFilter)) {
        matches = false;
      }

      // Due date filter
      if (dueDateFilter !== 'all') {
        const formatted = formatDueDate(task.dueDate);
        if (dueDateFilter === 'overdue' && (!formatted || !formatted.isOverdue)) {
          matches = false;
        } else if (dueDateFilter === 'today' && (!formatted || !formatted.isToday)) {
          matches = false;
        } else if (dueDateFilter === 'soon' && (!formatted || (!formatted.isSoon && !formatted.isToday))) {
          matches = false;
        } else if (dueDateFilter === 'has_date' && !task.dueDate) {
          matches = false;
        }
      }

      result[task.id] = matches;
    });

    return result;
  }, [board.tasks, searchQuery, priorityFilter, tagFilter, dueDateFilter]);

  // Task creation handler
  const handleCreateTask = (columnId?: string, initialTitle = '') => {
    const targetColId = columnId || (board.columns.length > 0 ? board.columns[0].id : 'todo');

    // If no columns exist at all, auto-create a first column
    if (board.columns.length === 0) {
      const firstCol = createCustomKanbanColumn('To Do', '#3b82f6');
      const newId = generateKanbanId('task');
      const newTask: KanbanTask = {
        id: newId,
        title: initialTitle.trim() || 'New Task',
        priority: 'medium',
        tags: [],
        subtasks: [],
        columnId: firstCol.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      firstCol.taskIds = [newId];
      const updatedBoard: KanbanBoardData = {
        ...board,
        columns: [firstCol],
        tasks: { [newId]: newTask },
      };
      persistBoard(updatedBoard);
      if (!initialTitle.trim()) {
        setActiveTaskId(newId);
        setIsModalOpen(true);
      }
      return;
    }

    const newId = generateKanbanId('task');
    const newTask: KanbanTask = {
      id: newId,
      title: initialTitle.trim() || 'New Task',
      priority: 'medium',
      tags: [],
      subtasks: [],
      columnId: targetColId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const targetColumn = board.columns.find((c) => c.id === targetColId) || board.columns[0];
    const updatedColumns = board.columns.map((col) => {
      if (col.id === targetColumn.id) {
        return { ...col, taskIds: [newId, ...col.taskIds] };
      }
      return col;
    });

    const updatedBoard: KanbanBoardData = {
      ...board,
      columns: updatedColumns,
      tasks: {
        ...board.tasks,
        [newId]: newTask,
      },
    };

    persistBoard(updatedBoard);

    if (!initialTitle.trim()) {
      setActiveTaskId(newId);
      setIsModalOpen(true);
    }
  };

  // Inline Quick Add Task in Column
  const handleFinishQuickAdd = (columnId: string) => {
    if (quickAddTitle.trim()) {
      handleCreateTask(columnId, quickAddTitle.trim());
    }
    setQuickAddColumnId(null);
    setQuickAddTitle('');
  };

  // Task update handler (from modal or quick actions)
  const handleSaveTask = (updatedTask: KanbanTask) => {
    const prevTask = board.tasks[updatedTask.id];
    let updatedColumns = [...board.columns];

    // If column changed inside modal
    if (prevTask && prevTask.columnId !== updatedTask.columnId) {
      updatedColumns = updatedColumns.map((col) => {
        if (col.id === prevTask.columnId) {
          return { ...col, taskIds: col.taskIds.filter((id) => id !== updatedTask.id) };
        }
        if (col.id === updatedTask.columnId) {
          return { ...col, taskIds: [updatedTask.id, ...col.taskIds] };
        }
        return col;
      });
    }

    const updatedBoard: KanbanBoardData = {
      ...board,
      columns: updatedColumns,
      tasks: {
        ...board.tasks,
        [updatedTask.id]: updatedTask,
      },
    };

    persistBoard(updatedBoard);
  };

  // Task delete handler
  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = { ...board.tasks };
    delete updatedTasks[taskId];

    const updatedColumns = board.columns.map((col) => ({
      ...col,
      taskIds: col.taskIds.filter((id) => id !== taskId),
    }));

    const updatedBoard: KanbanBoardData = {
      ...board,
      columns: updatedColumns,
      tasks: updatedTasks,
    };

    persistBoard(updatedBoard);
    if (activeTaskId === taskId) {
      setIsModalOpen(false);
      setActiveTaskId(null);
    }
  };

  // Move task to a specific column
  const handleMoveTaskToColumn = (taskId: string, targetColId: string) => {
    const task = board.tasks[taskId];
    if (!task || task.columnId === targetColId) return;

    const updatedColumns = board.columns.map((col) => {
      if (col.id === task.columnId) {
        return { ...col, taskIds: col.taskIds.filter((id) => id !== taskId) };
      }
      if (col.id === targetColId) {
        return { ...col, taskIds: [...col.taskIds, taskId] };
      }
      return col;
    });

    const updatedBoard: KanbanBoardData = {
      ...board,
      columns: updatedColumns,
      tasks: {
        ...board.tasks,
        [taskId]: {
          ...task,
          columnId: targetColId,
          updatedAt: Date.now(),
        },
      },
    };

    persistBoard(updatedBoard);
  };

  // --- Column Management Handlers ---

  // Add new custom column
  const handleAddColumn = (title: string, color = '#3b82f6') => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const newCol = createCustomKanbanColumn(cleanTitle, color);

    const updatedBoard: KanbanBoardData = {
      ...board,
      columns: [...board.columns, newCol],
    };

    persistBoard(updatedBoard);
    setIsAddingColumn(false);
    setNewColumnTitle('');
    setNewColumnColor(COLOR_PALETTE[0]);
  };

  // Start editing a column title
  const handleStartEditColumn = (col: KanbanColumn, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveMenuColumnId(null);
    setEditingColId(col.id);
    setEditingColTitle(col.title);
  };

  // Save renamed column title
  const handleSaveEditColumn = (colId: string) => {
    const cleanTitle = editingColTitle.trim();
    if (cleanTitle) {
      const updatedColumns = board.columns.map((c) =>
        c.id === colId ? { ...c, title: cleanTitle } : c
      );
      persistBoard({ ...board, columns: updatedColumns });
    }
    setEditingColId(null);
    setEditingColTitle('');
  };

  // Update column accent color
  const handleUpdateColumnColor = (colId: string, color: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedColumns = board.columns.map((c) =>
      c.id === colId ? { ...c, color } : c
    );
    persistBoard({ ...board, columns: updatedColumns });
    setActiveMenuColumnId(null);
  };

  // Reorder columns left / right
  const handleMoveColumn = (colId: string, direction: 'left' | 'right', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const idx = board.columns.findIndex((c) => c.id === colId);
    if (idx === -1) return;

    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= board.columns.length) return;

    const newCols = [...board.columns];
    const [moved] = newCols.splice(idx, 1);
    newCols.splice(targetIdx, 0, moved);

    persistBoard({ ...board, columns: newCols });
    setActiveMenuColumnId(null);
  };

  // Click delete column trigger
  const handleDeleteColumnClick = (col: KanbanColumn, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveMenuColumnId(null);
    const colTaskIds = col.taskIds.filter((tId) => Boolean(board.tasks[tId]));

    if (colTaskIds.length === 0) {
      // Direct removal if no tasks inside
      handleConfirmDeleteColumn(col.id, 'delete_tasks');
    } else {
      // Ask user whether to move tasks to another column or delete
      const otherCols = board.columns.filter((c) => c.id !== col.id);
      setDeleteMoveTargetColId(otherCols.length > 0 ? otherCols[0].id : '');
      setDeletingColumn(col);
    }
  };

  // Confirm delete column with task handling
  const handleConfirmDeleteColumn = (
    colId: string,
    action: 'move_tasks' | 'delete_tasks',
    targetColId?: string
  ) => {
    const targetCol = board.columns.find((c) => c.id === colId);
    if (!targetCol) return;

    const tasksInColumn = targetCol.taskIds.filter((tId) => Boolean(board.tasks[tId]));
    const updatedTasks = { ...board.tasks };
    let updatedColumns = board.columns.filter((c) => c.id !== colId);

    if (action === 'move_tasks' && targetColId && updatedColumns.some((c) => c.id === targetColId)) {
      // Re-assign tasks to target column
      tasksInColumn.forEach((tId) => {
        if (updatedTasks[tId]) {
          updatedTasks[tId] = {
            ...updatedTasks[tId],
            columnId: targetColId,
            updatedAt: Date.now(),
          };
        }
      });
      updatedColumns = updatedColumns.map((col) => {
        if (col.id === targetColId) {
          return {
            ...col,
            taskIds: [...col.taskIds, ...tasksInColumn],
          };
        }
        return col;
      });
    } else {
      // Remove tasks from task store
      tasksInColumn.forEach((tId) => {
        delete updatedTasks[tId];
      });
    }

    persistBoard({
      ...board,
      columns: updatedColumns,
      tasks: updatedTasks,
    });

    setDeletingColumn(null);
  };

  // Clear all tasks in a column
  const handleClearColumnTasks = (colId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetCol = board.columns.find((c) => c.id === colId);
    if (!targetCol) return;

    const tasksToRemove = new Set(targetCol.taskIds);
    const updatedTasks = { ...board.tasks };
    tasksToRemove.forEach((tId) => {
      delete updatedTasks[tId];
    });

    const updatedColumns = board.columns.map((c) =>
      c.id === colId ? { ...c, taskIds: [] } : c
    );

    persistBoard({
      ...board,
      columns: updatedColumns,
      tasks: updatedTasks,
    });
    setActiveMenuColumnId(null);
  };

  // --- HTML5 Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOverColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragOverTask = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverTaskId !== taskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleDropOnColumn = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverColumnId(null);
    setDragOverTaskId(null);

    if (!taskId || !board.tasks[taskId]) return;
    const currentTask = board.tasks[taskId];
    const sourceColId = currentTask.columnId;

    // Moving within same column or to another column
    const updatedColumns = board.columns.map((col) => {
      // Remove from old column
      if (col.id === sourceColId && col.id !== targetColId) {
        return { ...col, taskIds: col.taskIds.filter((id) => id !== taskId) };
      }
      // Add to new column at the end or at hovered position
      if (col.id === targetColId) {
        let newTaskIds = col.taskIds.filter((id) => id !== taskId);
        if (dragOverTaskId && dragOverTaskId !== taskId) {
          const insertIdx = newTaskIds.indexOf(dragOverTaskId);
          if (insertIdx !== -1) {
            newTaskIds.splice(insertIdx, 0, taskId);
          } else {
            newTaskIds.push(taskId);
          }
        } else {
          newTaskIds.push(taskId);
        }
        return { ...col, taskIds: newTaskIds };
      }
      return col;
    });

    const updatedBoard: KanbanBoardData = {
      ...board,
      columns: updatedColumns,
      tasks: {
        ...board.tasks,
        [taskId]: {
          ...currentTask,
          columnId: targetColId,
          updatedAt: Date.now(),
        },
      },
    };

    persistBoard(updatedBoard);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumnId(null);
    setDragOverTaskId(null);
  };

  // Toggle subtask directly on card
  const handleQuickToggleSubtask = (taskId: string, subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const task = board.tasks[taskId];
    if (!task) return;

    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subId ? { ...s, completed: !s.completed } : s
    );

    const updatedTask = { ...task, subtasks: updatedSubtasks, updatedAt: Date.now() };
    handleSaveTask(updatedTask);
  };

  // Title save
  const handleSaveBoardTitle = () => {
    if (boardTitleInput.trim() && boardTitleInput !== board.title) {
      persistBoard({ ...board, title: boardTitleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  // Reset columns to default 5 columns (To Do, In Progress, Stalled, Can't Be Done, Done)
  const handleResetToStandardColumns = () => {
    const existingColMap: Record<string, KanbanColumn> = {};
    board.columns.forEach((c) => {
      existingColMap[c.id] = c;
    });

    const standardCols: KanbanColumn[] = DEFAULT_KANBAN_COLUMNS.map((def) => {
      const existing = existingColMap[def.id];
      return {
        id: def.id,
        title: def.title,
        color: def.color,
        taskIds: existing ? existing.taskIds : [],
      };
    });

    // Re-assign tasks that were in removed columns to 'todo'
    const newTasks = { ...board.tasks };
    const validColIds = new Set(standardCols.map((c) => c.id));
    Object.values(newTasks).forEach((t) => {
      if (!validColIds.has(t.columnId)) {
        t.columnId = 'todo';
        if (!standardCols[0].taskIds.includes(t.id)) {
          standardCols[0].taskIds.push(t.id);
        }
      }
    });

    persistBoard({ ...board, columns: standardCols, tasks: newTasks });
    setShowResetColumnsModal(false);
  };

  const hasActiveFilters = searchQuery || priorityFilter !== 'all' || tagFilter !== 'all' || dueDateFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setTagFilter('all');
    setDueDateFilter('all');
  };

  const activeTask = activeTaskId ? board.tasks[activeTaskId] || null : null;

  return (
    <div
      id="kanban-board-editor"
      className="flex-1 flex flex-col h-full overflow-hidden select-none"
      style={{ backgroundColor: theme.ui.bgEditor, color: theme.ui.textMain }}
    >
      {/* --- Top Board Header & Controls Bar --- */}
      <div
        className="px-4 py-2.5 border-b shrink-0 flex flex-col gap-2.5"
        style={{
          backgroundColor: theme.ui.bgSidebarHeader,
          borderColor: theme.ui.border,
        }}
      >
        {/* Title, Stats & Primary Action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Board Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 shadow-2xs"
              style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}
            >
              <KanbanIcon size={16} />
            </div>

            {isEditingTitle ? (
              <input
                type="text"
                value={boardTitleInput}
                onChange={(e) => setBoardTitleInput(e.target.value)}
                onBlur={handleSaveBoardTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveBoardTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="text-sm font-semibold px-2 py-0.5 rounded border outline-none shadow-2xs"
                style={{
                  backgroundColor: theme.ui.inputBg,
                  borderColor: '#3b82f6',
                  color: theme.ui.textMain,
                }}
                autoFocus
              />
            ) : (
              <div
                onClick={() => {
                  setBoardTitleInput(board.title);
                  setIsEditingTitle(true);
                }}
                className="group flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                title="Click to rename board"
              >
                <h1 className="text-sm font-semibold tracking-tight truncate max-w-xs sm:max-w-md">
                  {board.title}
                </h1>
                <Edit2
                  size={12}
                  className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                />
              </div>
            )}

            {/* Board Status Pill */}
            <div
              className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium border shrink-0"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                borderColor: theme.ui.border,
                color: theme.ui.textMuted,
              }}
            >
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span>
                  {stats.completedTasks}/{stats.totalTasks} Done ({stats.completionPercent}%)
                </span>
              </span>
              {stats.totalSubtasks > 0 && (
                <>
                  <span>•</span>
                  <span>
                    {stats.completedSubtasks}/{stats.totalSubtasks} subtasks
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {/* View Mode Switcher (Board vs Table) */}
            <div
              className="flex items-center rounded-lg p-0.5 border shrink-0 mr-1"
              style={{
                backgroundColor: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)',
                borderColor: theme.ui.border,
              }}
            >
              <button
                id="kanban-view-board-btn"
                type="button"
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'board'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Switch to Kanban Board View"
              >
                <KanbanIcon size={13} />
                <span>Board</span>
              </button>
              <button
                id="kanban-view-table-btn"
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Switch to Sectioned Table View"
              >
                <Table size={13} />
                <span>Table</span>
              </button>
            </div>

            {/* Add Column Button */}
            <button
              id="kanban-btn-add-col-top"
              onClick={() => {
                setIsAddingColumn(true);
                setNewColumnTitle('');
                setNewColumnColor(COLOR_PALETTE[0]);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium text-xs border transition-colors shadow-2xs hover:border-blue-500"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : theme.ui.inputBg,
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
              title="Add a custom column to this board"
            >
              <Columns size={13} className="text-blue-500" />
              <span>Add Column</span>
            </button>

            {/* Board Options / Reset Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBoardMenu(!showBoardMenu);
                }}
                className="p-1.5 rounded border transition-colors hover:border-neutral-400"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : theme.ui.inputBg,
                  borderColor: theme.ui.border,
                  color: theme.ui.textMuted,
                }}
                title="Board Options & Column Presets"
              >
                <MoreHorizontal size={14} />
              </button>

              {showBoardMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 w-56 rounded-md border shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                  style={{
                    backgroundColor: theme.ui.modalBg || theme.ui.bgSidebar,
                    borderColor: theme.ui.border,
                    color: theme.ui.textMain,
                  }}
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-60 border-b" style={{ borderColor: theme.ui.border }}>
                    Board Management
                  </div>
                  <button
                    onClick={() => {
                      setShowBoardMenu(false);
                      setIsAddingColumn(true);
                      setNewColumnTitle('');
                      setNewColumnColor(COLOR_PALETTE[0]);
                    }}
                    className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                  >
                    <Plus size={13} />
                    <span>Add Custom Column</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowBoardMenu(false);
                      setShowResetColumnsModal(true);
                    }}
                    className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
                  >
                    <RotateCcw size={13} />
                    <span>Reset to Standard 5 Columns</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add Task Primary Button */}
            <button
              id="kanban-btn-add-task-top"
              onClick={() => handleCreateTask()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-xs shadow-xs transition-colors"
            >
              <Plus size={14} />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, tags, or subtasks..."
              className="w-full text-xs pl-8 pr-3 py-1 rounded border outline-none focus:border-blue-500 transition-colors"
              style={{
                backgroundColor: theme.ui.inputBg,
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium" style={{ color: theme.ui.textMuted }}>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs px-2 py-1 rounded border outline-none cursor-pointer"
              style={{
                backgroundColor: theme.ui.inputBg,
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🔵 Low</option>
            </select>
          </div>

          {/* Tag Filter */}
          {allUniqueTags.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium" style={{ color: theme.ui.textMuted }}>Tag:</span>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="text-xs px-2 py-1 rounded border outline-none cursor-pointer max-w-[120px] truncate"
                style={{
                  backgroundColor: theme.ui.inputBg,
                  borderColor: theme.ui.border,
                  color: theme.ui.textMain,
                }}
              >
                <option value="all">All Tags</option>
                {allUniqueTags.map((tag) => (
                  <option key={tag} value={tag}>
                    🏷️ {tag}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Due Date Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium" style={{ color: theme.ui.textMuted }}>Due:</span>
            <select
              value={dueDateFilter}
              onChange={(e) => setDueDateFilter(e.target.value)}
              className="text-xs px-2 py-1 rounded border outline-none cursor-pointer"
              style={{
                backgroundColor: theme.ui.inputBg,
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
            >
              <option value="all">All Dates</option>
              <option value="overdue">⚠️ Overdue</option>
              <option value="today">📅 Due Today</option>
              <option value="soon">⏰ Due in 2 Days</option>
              <option value="has_date">📌 Has Due Date</option>
            </select>
          </div>

          {/* Reset Filters Pill */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-2 py-0.5 rounded text-[11px] text-amber-400 hover:bg-amber-500/10 flex items-center gap-1 border border-amber-500/30 transition-colors"
            >
              <X size={11} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* --- Main Workspace (Table View vs Board Columns View) --- */}
      {viewMode === 'table' ? (
        <KanbanTableView
          board={board}
          currentTheme={currentTheme}
          filteredTasksMap={filteredTasksMap}
          onOpenTaskModal={(taskId) => {
            setActiveTaskId(taskId);
            setIsModalOpen(true);
          }}
          onSaveTask={handleSaveTask}
          onDeleteTask={handleDeleteTask}
          onCreateTask={(colId, title) => handleCreateTask(colId, title)}
          onMoveTaskToColumn={handleMoveTaskToColumn}
          onStartAddColumn={() => {
            setIsAddingColumn(true);
            setNewColumnTitle('');
            setNewColumnColor(COLOR_PALETTE[0]);
          }}
          onStartEditColumn={handleStartEditColumn}
          onUpdateColumnColor={handleUpdateColumnColor}
          onMoveColumn={handleMoveColumn}
          onDeleteColumn={handleDeleteColumnClick}
        />
      ) : (
        <div className="flex-1 overflow-x-auto p-4 flex gap-4 items-start custom-scrollbar">
        {board.columns.length === 0 ? (
          /* Empty Board State */
          <div
            className="flex-1 max-w-lg mx-auto my-12 p-8 rounded-xl border border-dashed text-center flex flex-col items-center justify-center gap-4"
            style={{
              backgroundColor: theme.ui.bgSidebar,
              borderColor: theme.ui.border,
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}
            >
              <Columns size={24} />
            </div>
            <div>
              <h3 className="text-base font-semibold mb-1" style={{ color: theme.ui.textHeader }}>
                No columns on this board
              </h3>
              <p className="text-xs max-w-sm" style={{ color: theme.ui.textMuted }}>
                Create your custom workflow columns (e.g. Backlog, Sprint, Review, Done) or restore standard presets.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsAddingColumn(true);
                  setNewColumnTitle('To Do');
                  setNewColumnColor(COLOR_PALETTE[0]);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors shadow-xs"
              >
                <Plus size={14} />
                <span>Add First Column</span>
              </button>
              <button
                onClick={handleResetToStandardColumns}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:border-neutral-400"
                style={{
                  backgroundColor: theme.ui.inputBg,
                  borderColor: theme.ui.border,
                  color: theme.ui.textMain,
                }}
              >
                <RotateCcw size={13} />
                <span>Load Default Columns</span>
              </button>
            </div>
          </div>
        ) : (
          board.columns.map((column, colIndex) => {
            const colTaskIds = column.taskIds.filter((tId) => Boolean(board.tasks[tId]));
            const visibleTaskIds = colTaskIds.filter((tId) => filteredTasksMap[tId] !== false);
            const isDragOver = dragOverColumnId === column.id;
            const isMenuOpen = activeMenuColumnId === column.id;
            const isEditingThisCol = editingColId === column.id;

            return (
              <div
                key={column.id}
                id={`kanban-column-${column.id}`}
                onDragOver={(e) => handleDragOverColumn(e, column.id)}
                onDrop={(e) => handleDropOnColumn(e, column.id)}
                className={`w-72 sm:w-80 shrink-0 max-h-full flex flex-col rounded-lg border transition-colors relative ${
                  isDragOver ? 'ring-2 ring-blue-500/60 bg-blue-500/5' : ''
                }`}
                style={{
                  backgroundColor: theme.ui.bgSidebar,
                  borderColor: isDragOver ? column.color : theme.ui.border,
                }}
              >
                {/* Column Header */}
                <div
                  className="px-3.5 py-2.5 border-b flex items-center justify-between shrink-0 select-none relative"
                  style={{ borderColor: theme.ui.border }}
                >
                  {isEditingThisCol ? (
                    /* Inline Column Rename Input */
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: column.color }}
                      />
                      <input
                        type="text"
                        value={editingColTitle}
                        onChange={(e) => setEditingColTitle(e.target.value)}
                        onBlur={() => handleSaveEditColumn(column.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditColumn(column.id);
                          if (e.key === 'Escape') setEditingColId(null);
                        }}
                        className="text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border outline-none flex-1 min-w-0"
                        style={{
                          backgroundColor: theme.ui.inputBg,
                          borderColor: '#3b82f6',
                          color: theme.ui.textMain,
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEditColumn(column.id)}
                        className="p-1 text-emerald-400 hover:text-emerald-300 rounded"
                        title="Save column title"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => setEditingColId(null)}
                        className="p-1 text-neutral-400 hover:text-white rounded"
                        title="Cancel rename"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    /* Normal Column Header Display */
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs cursor-pointer hover:scale-125 transition-transform"
                        style={{ backgroundColor: column.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuColumnId(isMenuOpen ? null : column.id);
                        }}
                        title="Click to change color or edit column"
                      />
                      <h3
                        onDoubleClick={(e) => handleStartEditColumn(column, e)}
                        className="text-xs font-semibold uppercase tracking-wider truncate cursor-pointer hover:text-blue-400 transition-colors"
                        style={{ color: theme.ui.textHeader }}
                        title="Double-click to rename column"
                      >
                        {column.title}
                      </h3>
                      <span
                        className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium border shrink-0"
                        style={{
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                          borderColor: theme.ui.border,
                          color: theme.ui.textMuted,
                        }}
                      >
                        {visibleTaskIds.length}
                        {visibleTaskIds.length !== colTaskIds.length ? ` / ${colTaskIds.length}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Header Actions: Quick Add & Column Menu */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => {
                        setQuickAddColumnId(column.id);
                        setQuickAddTitle('');
                      }}
                      className="p-1 text-neutral-400 hover:text-blue-400 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      title="Add task to this column"
                    >
                      <Plus size={14} />
                    </button>

                    {/* Column Options Menu Dropdown Trigger */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuColumnId(isMenuOpen ? null : column.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isMenuOpen
                            ? 'text-blue-400 bg-blue-500/10'
                            : 'text-neutral-400 hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                        title="Column options"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {/* Dropdown Popover */}
                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 w-56 rounded-md border shadow-2xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                          style={{
                            backgroundColor: theme.ui.modalBg || theme.ui.bgSidebar,
                            borderColor: theme.ui.border,
                            color: theme.ui.textMain,
                          }}
                        >
                          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-60 border-b mb-1" style={{ borderColor: theme.ui.border }}>
                            Column Actions
                          </div>

                          {/* Rename */}
                          <button
                            onClick={(e) => handleStartEditColumn(column, e)}
                            className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                          >
                            <Edit2 size={13} />
                            <span>Rename Column</span>
                          </button>

                          {/* Color Palette Selector */}
                          <div className="px-3 py-2 border-t border-b my-1" style={{ borderColor: theme.ui.border }}>
                            <span className="text-[10px] font-medium opacity-70 block mb-1.5 flex items-center gap-1">
                              <Palette size={11} />
                              <span>Accent Color</span>
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {COLOR_PALETTE.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={(e) => handleUpdateColumnColor(column.id, c, e)}
                                  className="w-4 h-4 rounded-full border transition-transform hover:scale-125"
                                  style={{
                                    backgroundColor: c,
                                    borderColor: column.color === c ? '#ffffff' : 'transparent',
                                    boxShadow: column.color === c ? '0 0 0 1.5px #3b82f6' : 'none',
                                  }}
                                  title={c}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Move Left / Right */}
                          <div className="flex items-center px-1.5 py-1 gap-1">
                            <button
                              disabled={colIndex === 0}
                              onClick={(e) => handleMoveColumn(column.id, 'left', e)}
                              className="flex-1 px-2 py-1 text-[11px] rounded flex items-center justify-center gap-1 border disabled:opacity-30 disabled:pointer-events-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              style={{ borderColor: theme.ui.border }}
                              title="Move column left"
                            >
                              <ArrowLeft size={11} />
                              <span>Move Left</span>
                            </button>
                            <button
                              disabled={colIndex === board.columns.length - 1}
                              onClick={(e) => handleMoveColumn(column.id, 'right', e)}
                              className="flex-1 px-2 py-1 text-[11px] rounded flex items-center justify-center gap-1 border disabled:opacity-30 disabled:pointer-events-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              style={{ borderColor: theme.ui.border }}
                              title="Move column right"
                            >
                              <span>Move Right</span>
                              <ArrowRight size={11} />
                            </button>
                          </div>

                          {/* Clear tasks */}
                          {colTaskIds.length > 0 && (
                            <button
                              onClick={(e) => handleClearColumnTasks(column.id, e)}
                              className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 text-amber-500 hover:bg-amber-500/10 transition-colors"
                            >
                              <RotateCcw size={13} />
                              <span>Clear All {colTaskIds.length} Task(s)</span>
                            </button>
                          )}

                          {/* Delete Column */}
                          <button
                            onClick={(e) => handleDeleteColumnClick(column, e)}
                            className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={13} />
                            <span>Delete Column</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column Task Cards Container (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[140px] max-h-[calc(100vh-210px)] custom-scrollbar">
                  {visibleTaskIds.length === 0 && !quickAddColumnId ? (
                    <div
                      onClick={() => {
                        setQuickAddColumnId(column.id);
                        setQuickAddTitle('');
                      }}
                      className="h-28 border border-dashed rounded-md flex flex-col items-center justify-center text-center p-3 text-neutral-500 hover:text-neutral-400 hover:border-neutral-500 cursor-pointer transition-colors"
                      style={{ borderColor: theme.ui.border }}
                    >
                      <Plus size={18} className="mb-1 opacity-50" />
                      <span className="text-xs font-medium">No tasks</span>
                      <span className="text-[10px] opacity-70">Click or drag task here</span>
                    </div>
                  ) : (
                    visibleTaskIds.map((taskId) => {
                      const task = board.tasks[taskId];
                      if (!task) return null;

                      const priorityInfo = getPriorityMeta(task.priority);
                      const subtaskStats = calculateSubtaskProgress(task.subtasks);
                      const dueInfo = formatDueDate(task.dueDate);
                      const isDragging = draggedTaskId === taskId;
                      const isOverThisTask = dragOverTaskId === taskId;

                      return (
                        <div
                          key={task.id}
                          id={`kanban-card-${task.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragOver={(e) => handleDragOverTask(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            setActiveTaskId(task.id);
                            setIsModalOpen(true);
                          }}
                          className={`group relative rounded-md border p-3 cursor-grab active:cursor-grabbing shadow-xs transition-all hover:shadow-md ${
                            isDragging ? 'opacity-30 scale-95' : 'opacity-100'
                          } ${isOverThisTask ? 'border-t-2 border-t-blue-500' : ''}`}
                          style={{
                            backgroundColor: theme.ui.bgEditor,
                            borderColor: theme.ui.border,
                          }}
                        >
                          {/* Top Row: Priority Badge & Move Column Dropdown */}
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            {/* Priority Badge */}
                            <div
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${priorityInfo.bgColor} ${priorityInfo.textColor} ${priorityInfo.borderColor}`}
                            >
                              {task.priority === 'urgent' && <Flame size={11} className="shrink-0 animate-pulse" />}
                              {task.priority === 'high' && <ArrowUp size={11} className="shrink-0" />}
                              {task.priority === 'medium' && <Equal size={11} className="shrink-0" />}
                              {task.priority === 'low' && <ArrowDown size={11} className="shrink-0" />}
                              <span>{priorityInfo.label}</span>
                            </div>

                            {/* Quick Column Movement Selector on Card */}
                            {board.columns.length > 1 && (
                              <select
                                value={task.columnId}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleMoveTaskToColumn(task.id, e.target.value);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded border bg-transparent hover:border-blue-500 outline-none cursor-pointer transition-all"
                                style={{
                                  borderColor: theme.ui.border,
                                  color: theme.ui.textMuted,
                                }}
                              >
                                {board.columns.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    → {c.title}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Task Title */}
                          <h4
                            className="text-xs font-semibold leading-snug line-clamp-2 mb-1.5 group-hover:text-blue-500 transition-colors"
                            style={{ color: theme.ui.textMain }}
                          >
                            {task.title}
                          </h4>

                          {/* Description Preview (if present) */}
                          {task.description && (
                            <p
                              className="text-[11px] line-clamp-2 mb-2 leading-relaxed opacity-75 font-sans"
                              style={{ color: theme.ui.textMuted }}
                            >
                              {task.description}
                            </p>
                          )}

                          {/* Colored Tags List */}
                          {task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {task.tags.map((tagName) => {
                                const tagColor = getTagColor(tagName, board.customTags);
                                return (
                                  <span
                                    key={tagName}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1"
                                    style={{
                                      backgroundColor: `${tagColor}20`,
                                      color: tagColor,
                                      borderColor: `${tagColor}40`,
                                    }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: tagColor }}
                                    />
                                    <span>{tagName}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Subtasks Preview & Checklist Summary */}
                          {task.subtasks.length > 0 && (
                            <div
                              className="mb-2 pt-1.5 border-t"
                              style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                            >
                              <div className="flex items-center justify-between text-[10px] mb-1">
                                <span
                                  className="flex items-center gap-1 font-medium"
                                  style={{ color: theme.ui.textMuted }}
                                >
                                  <CheckSquare size={11} className="text-emerald-500" />
                                  <span>
                                    {subtaskStats.completed}/{subtaskStats.total} subtasks
                                  </span>
                                </span>
                                <span
                                  className="font-mono text-[10px]"
                                  style={{ color: theme.ui.textMuted }}
                                >
                                  {subtaskStats.percent}%
                                </span>
                              </div>

                              {/* Mini Progress Bar */}
                              <div
                                className="w-full h-1 rounded-full overflow-hidden"
                                style={{ backgroundColor: theme.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)' }}
                              >
                                <div
                                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                                  style={{ width: `${subtaskStats.percent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Card Bottom Meta (Due Date & Assignee) */}
                          <div
                            className="flex items-center justify-between text-[10px] pt-1.5 border-t gap-1"
                            style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                          >
                            {/* Due Date Indicator */}
                            {dueInfo ? (
                              <div
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${
                                  dueInfo.isOverdue
                                    ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                                    : dueInfo.isToday
                                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                    : 'text-neutral-600 dark:text-neutral-400 border border-transparent'
                                }`}
                                style={{
                                  color: (!dueInfo.isOverdue && !dueInfo.isToday) ? theme.ui.textMuted : undefined,
                                }}
                                title={task.dueDate}
                              >
                                <Calendar size={10} className="shrink-0" />
                                <span>{dueInfo.text}</span>
                              </div>
                            ) : (
                              <span />
                            )}

                            {/* Assignee / Quick delete */}
                            <div className="flex items-center gap-1.5">
                              {task.assignee && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 shadow-2xs"
                                  style={{
                                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
                                    color: theme.ui.textMain,
                                    borderColor: theme.ui.border,
                                  }}
                                  title={`Assigned to ${task.assignee}`}
                                >
                                  <User size={9} className="opacity-70 shrink-0" />
                                  <span>{task.assignee}</span>
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-red-400 rounded transition-opacity"
                                title="Delete Task"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Inline Quick Add Input Box */}
                  {quickAddColumnId === column.id && (
                    <div
                      className="p-2.5 rounded-md border shadow-md animate-in fade-in zoom-in-95 duration-100"
                      style={{
                        backgroundColor: theme.ui.bgEditor,
                        borderColor: '#3b82f6',
                      }}
                    >
                      <input
                        type="text"
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        placeholder="Enter task title..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFinishQuickAdd(column.id);
                          } else if (e.key === 'Escape') {
                            setQuickAddColumnId(null);
                          }
                        }}
                        className="w-full text-xs px-2.5 py-1.5 rounded border outline-none mb-2"
                        style={{
                          backgroundColor: theme.ui.inputBg,
                          borderColor: theme.ui.border,
                          color: theme.ui.textMain,
                        }}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuickAddColumnId(null)}
                          className="px-2 py-1 text-[11px] text-neutral-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFinishQuickAdd(column.id)}
                          disabled={!quickAddTitle.trim()}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded text-[11px] font-medium transition-colors"
                        >
                          Add Card
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom "+ Add Card" Quick Trigger Button */}
                {quickAddColumnId !== column.id && (
                  <div
                    className="p-2 border-t shrink-0"
                    style={{ borderColor: theme.ui.border }}
                  >
                    <button
                      onClick={() => {
                        setQuickAddColumnId(column.id);
                        setQuickAddTitle('');
                      }}
                      className="w-full py-1.5 px-2.5 rounded text-xs font-medium text-neutral-400 hover:text-white hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus size={13} />
                      <span>Add a task</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* --- End of Track: "+ Add Column" Inline Card --- */}
        {isAddingColumn ? (
          <div
            className="w-72 sm:w-80 shrink-0 p-3.5 rounded-lg border flex flex-col gap-3 shadow-md animate-in fade-in zoom-in-95 duration-100"
            style={{
              backgroundColor: theme.ui.bgSidebar,
              borderColor: '#3b82f6',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.ui.textHeader }}>
                New Column
              </span>
              <button
                onClick={() => setIsAddingColumn(false)}
                className="text-neutral-400 hover:text-white p-0.5 rounded"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <input
                type="text"
                placeholder="Column name (e.g. Backlog, QA, Review)..."
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn(newColumnTitle, newColumnColor);
                  if (e.key === 'Escape') setIsAddingColumn(false);
                }}
                className="w-full text-xs px-2.5 py-1.5 rounded border outline-none"
                style={{
                  backgroundColor: theme.ui.inputBg,
                  borderColor: theme.ui.border,
                  color: theme.ui.textMain,
                }}
                autoFocus
              />
            </div>

            {/* Color Swatch Picker */}
            <div>
              <span className="text-[10px] font-medium block mb-1.5" style={{ color: theme.ui.textMuted }}>
                Column Color Accent
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColumnColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: newColumnColor === c ? '#ffffff' : 'transparent',
                      boxShadow: newColumnColor === c ? '0 0 0 1.5px #3b82f6' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingColumn(false)}
                className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAddColumn(newColumnTitle, newColumnColor)}
                disabled={!newColumnTitle.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded text-xs font-medium transition-colors shadow-xs"
              >
                Create Column
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setIsAddingColumn(true);
              setNewColumnTitle('');
              setNewColumnColor(COLOR_PALETTE[0]);
            }}
            className="w-72 sm:w-80 shrink-0 h-32 border border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-400 transition-colors group cursor-pointer"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              borderColor: theme.ui.border,
              color: theme.ui.textMuted,
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}
            >
              <Plus size={16} />
            </div>
            <span className="text-xs font-semibold">Add another column</span>
          </button>
        )}
        </div>
      )}

      {/* --- Column Deletion Confirmation Modal --- */}
      {deletingColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div
            className="w-full max-w-md rounded-xl border p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-100"
            style={{
              backgroundColor: theme.ui.modalBg || theme.ui.bgSidebar,
              borderColor: theme.ui.border,
              color: theme.ui.textMain,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: theme.ui.textHeader }}>
                  Delete "{deletingColumn.title}" Column?
                </h3>
                <p className="text-xs" style={{ color: theme.ui.textMuted }}>
                  This column currently contains{' '}
                  <span className="font-semibold text-white">
                    {deletingColumn.taskIds.filter((id) => Boolean(board.tasks[id])).length}
                  </span>{' '}
                  task(s).
                </p>
              </div>
            </div>

            {/* If other columns exist, provide option to move tasks */}
            {board.columns.filter((c) => c.id !== deletingColumn.id).length > 0 ? (
              <div className="space-y-3 text-xs pt-1">
                <p className="font-medium" style={{ color: theme.ui.textMain }}>
                  What should happen to the tasks in this column?
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteColAction"
                      checked={Boolean(deleteMoveTargetColId)}
                      onChange={() => {
                        const remaining = board.columns.filter((c) => c.id !== deletingColumn.id);
                        setDeleteMoveTargetColId(remaining[0]?.id || '');
                      }}
                      className="accent-blue-600"
                    />
                    <span>Move all tasks to another column:</span>
                  </label>

                  {deleteMoveTargetColId && (
                    <div className="pl-6">
                      <select
                        value={deleteMoveTargetColId}
                        onChange={(e) => setDeleteMoveTargetColId(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border outline-none"
                        style={{
                          backgroundColor: theme.ui.inputBg,
                          borderColor: theme.ui.border,
                          color: theme.ui.textMain,
                        }}
                      >
                        {board.columns
                          .filter((c) => c.id !== deletingColumn.id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteColAction"
                      checked={!deleteMoveTargetColId}
                      onChange={() => setDeleteMoveTargetColId('')}
                      className="accent-red-600"
                    />
                    <span className="text-red-400">Permanently delete all tasks in this column</span>
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-xs text-red-400">
                This is the last column on the board. Deleting it will also delete all tasks inside it.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: theme.ui.border }}>
              <button
                type="button"
                onClick={() => setDeletingColumn(null)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteMoveTargetColId) {
                    handleConfirmDeleteColumn(deletingColumn.id, 'move_tasks', deleteMoveTargetColId);
                  } else {
                    handleConfirmDeleteColumn(deletingColumn.id, 'delete_tasks');
                  }
                }}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold transition-colors shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Reset to Standard Columns Confirmation Modal --- */}
      {showResetColumnsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div
            className="w-full max-w-md rounded-xl border p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-100"
            style={{
              backgroundColor: theme.ui.modalBg || theme.ui.bgSidebar,
              borderColor: theme.ui.border,
              color: theme.ui.textMain,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <RotateCcw size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: theme.ui.textHeader }}>
                  Reset Columns to Standard Presets?
                </h3>
                <p className="text-xs" style={{ color: theme.ui.textMuted }}>
                  This will configure the 5 default columns: To Do, In Progress, Stalled, Can't Be Done, and Done.
                </p>
              </div>
            </div>

            <p className="text-xs" style={{ color: theme.ui.textMuted }}>
              Any tasks currently in custom columns will be safely preserved and moved into the <strong>To Do</strong> column.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: theme.ui.border }}>
              <button
                type="button"
                onClick={() => setShowResetColumnsModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToStandardColumns}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition-colors shadow-xs"
              >
                Reset Columns
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Task Edit/Detail Modal --- */}
      <KanbanTaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveTaskId(null);
        }}
        task={activeTask}
        board={board}
        currentTheme={currentTheme}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
};
