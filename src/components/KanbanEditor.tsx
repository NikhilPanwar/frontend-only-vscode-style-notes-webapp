import React, { useState, useMemo, useCallback } from 'react';
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
  ChevronRight,
  Flame,
  ArrowUp,
  Equal,
  ArrowDown,
  X,
  RotateCcw,
  Sparkles,
  Columns,
  Download,
  Share2,
  User,
  Kanban as KanbanIcon,
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
  DEFAULT_KANBAN_COLUMNS,
  formatDueDate,
  generateKanbanId,
  getPriorityMeta,
  getTagColor,
  parseKanbanData,
  serializeKanbanData,
} from '../utils/kanbanUtils';
import { KanbanTaskModal } from './KanbanTaskModal';

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
  const handleCreateTask = (columnId: string, initialTitle = '') => {
    const newId = generateKanbanId('task');
    const newTask: KanbanTask = {
      id: newId,
      title: initialTitle.trim() || 'New Task',
      priority: 'medium',
      tags: [],
      subtasks: [],
      columnId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const targetColumn = board.columns.find((c) => c.id === columnId) || board.columns[0];
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

  // Reset columns to default 5 columns
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
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
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
                className="text-sm font-semibold px-2 py-0.5 rounded border outline-none bg-black/20 text-white"
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
            <button
              id="kanban-btn-add-task-top"
              onClick={() => handleCreateTask(board.columns[0]?.id || 'todo')}
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

      {/* --- Main Kanban Columns Workspace --- */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-4 items-start custom-scrollbar">
        {board.columns.map((column) => {
          const colTaskIds = column.taskIds.filter((tId) => Boolean(board.tasks[tId]));
          const visibleTaskIds = colTaskIds.filter((tId) => filteredTasksMap[tId] !== false);
          const isDragOver = dragOverColumnId === column.id;

          return (
            <div
              key={column.id}
              id={`kanban-column-${column.id}`}
              onDragOver={(e) => handleDragOverColumn(e, column.id)}
              onDrop={(e) => handleDropOnColumn(e, column.id)}
              className={`w-72 sm:w-80 shrink-0 max-h-full flex flex-col rounded-lg border transition-colors ${
                isDragOver ? 'ring-2 ring-blue-500/60 bg-blue-500/5' : ''
              }`}
              style={{
                backgroundColor: theme.ui.bgSidebar,
                borderColor: isDragOver ? column.color : theme.ui.border,
              }}
            >
              {/* Column Header */}
              <div
                className="px-3.5 py-2.5 border-b flex items-center justify-between shrink-0 select-none"
                style={{ borderColor: theme.ui.border }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider truncate"
                    style={{ color: theme.ui.textHeader }}
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

                {/* Column quick add button */}
                <button
                  onClick={() => {
                    setQuickAddColumnId(column.id);
                    setQuickAddTitle('');
                  }}
                  className="p-1 text-neutral-400 hover:text-blue-400 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                  title="Add task to this column"
                >
                  <Plus size={14} />
                </button>
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
        })}
      </div>

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
