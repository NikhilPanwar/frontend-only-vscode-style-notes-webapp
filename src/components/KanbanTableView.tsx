import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  User,
  Tag as TagIcon,
  CheckCircle2,
  Clock,
  MoreVertical,
  ArrowUp,
  Equal,
  ArrowDown,
  Flame,
  AlertCircle,
  Columns,
  CheckSquare,
  Square,
  Check,
  X,
  ExternalLink,
  ChevronsUpDown,
  Filter,
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
  calculateSubtaskProgress,
  COLOR_PALETTE,
  formatDueDate,
  generateKanbanId,
  getPriorityMeta,
  getTagColor,
} from '../utils/kanbanUtils';

interface KanbanTableViewProps {
  board: KanbanBoardData;
  currentTheme: ThemeType;
  filteredTasksMap: Record<string, boolean>;
  onOpenTaskModal: (taskId: string) => void;
  onSaveTask: (task: KanbanTask) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (columnId: string, title?: string) => void;
  onMoveTaskToColumn: (taskId: string, targetColId: string) => void;
  onStartAddColumn: () => void;
  onStartEditColumn: (column: KanbanColumn, e?: React.MouseEvent) => void;
  onUpdateColumnColor: (colId: string, color: string, e?: React.MouseEvent) => void;
  onMoveColumn: (colId: string, direction: 'left' | 'right', e?: React.MouseEvent) => void;
  onDeleteColumn: (column: KanbanColumn, e?: React.MouseEvent) => void;
}

export const KanbanTableView: React.FC<KanbanTableViewProps> = ({
  board,
  currentTheme,
  filteredTasksMap,
  onOpenTaskModal,
  onSaveTask,
  onDeleteTask,
  onCreateTask,
  onMoveTaskToColumn,
  onStartAddColumn,
  onStartEditColumn,
  onUpdateColumnColor,
  onMoveColumn,
  onDeleteColumn,
}) => {
  const theme = THEMES[currentTheme];

  // Collapsed state for each column section
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Expanded subtask rows
  const [expandedSubtaskTaskIds, setExpandedSubtaskTaskIds] = useState<Record<string, boolean>>({});

  // Quick inline add task inputs per section
  const [sectionQuickAddTitles, setSectionQuickAddTitles] = useState<Record<string, string>>({});

  // Quick inline new subtask input
  const [quickSubtaskInput, setQuickSubtaskInput] = useState<Record<string, string>>({});

  // Active section action menu popover
  const [activeMenuColId, setActiveMenuColId] = useState<string | null>(null);

  // Inline editing task titles directly in table
  const [editingTaskTitleId, setEditingTaskTitleId] = useState<string | null>(null);
  const [editingTaskTitleValue, setEditingTaskTitleValue] = useState<string>('');

  // Toggle collapse for a single section
  const toggleSectionCollapse = (colId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [colId]: !prev[colId],
    }));
  };

  // Expand / Collapse all sections
  const allCollapsed = board.columns.length > 0 && board.columns.every((c) => collapsedSections[c.id]);
  const toggleAllSections = () => {
    if (allCollapsed) {
      setCollapsedSections({});
    } else {
      const next: Record<string, boolean> = {};
      board.columns.forEach((c) => {
        next[c.id] = true;
      });
      setCollapsedSections(next);
    }
  };

  // Toggle subtasks expanded view for a task
  const toggleSubtasksExpanded = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedSubtaskTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Submit quick add in section
  const handleQuickAddSubmit = (colId: string) => {
    const title = (sectionQuickAddTitles[colId] || '').trim();
    if (title) {
      onCreateTask(colId, title);
      setSectionQuickAddTitles((prev) => ({ ...prev, [colId]: '' }));
    }
  };

  // Handle inline subtask checkbox toggle
  const handleToggleSubtask = (taskId: string, subtaskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const task = board.tasks[taskId];
    if (!task) return;

    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    onSaveTask({
      ...task,
      subtasks: updatedSubtasks,
      updatedAt: Date.now(),
    });
  };

  // Add subtask inline from table
  const handleAddSubtaskInline = (taskId: string) => {
    const task = board.tasks[taskId];
    const subTitle = (quickSubtaskInput[taskId] || '').trim();
    if (!task || !subTitle) return;

    const newSubtask = {
      id: generateKanbanId('sub'),
      title: subTitle,
      completed: false,
    };

    onSaveTask({
      ...task,
      subtasks: [...task.subtasks, newSubtask],
      updatedAt: Date.now(),
    });

    setQuickSubtaskInput((prev) => ({ ...prev, [taskId]: '' }));
  };

  // Handle priority change
  const handleChangePriority = (taskId: string, priority: KanbanPriority) => {
    const task = board.tasks[taskId];
    if (!task || task.priority === priority) return;
    onSaveTask({
      ...task,
      priority,
      updatedAt: Date.now(),
    });
  };

  // Handle due date change
  const handleChangeDueDate = (taskId: string, dueDate: string) => {
    const task = board.tasks[taskId];
    if (!task) return;
    onSaveTask({
      ...task,
      dueDate: dueDate || undefined,
      updatedAt: Date.now(),
    });
  };

  // Handle assignee change
  const handleChangeAssignee = (taskId: string, assignee: string) => {
    const task = board.tasks[taskId];
    if (!task) return;
    onSaveTask({
      ...task,
      assignee: assignee.trim() || undefined,
      updatedAt: Date.now(),
    });
  };

  // Handle task inline rename
  const handleStartRenameTask = (task: KanbanTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskTitleId(task.id);
    setEditingTaskTitleValue(task.title);
  };

  const handleSaveRenameTask = (taskId: string) => {
    const task = board.tasks[taskId];
    if (task && editingTaskTitleValue.trim() && editingTaskTitleValue.trim() !== task.title) {
      onSaveTask({
        ...task,
        title: editingTaskTitleValue.trim(),
        updatedAt: Date.now(),
      });
    }
    setEditingTaskTitleId(null);
  };

  return (
    <div
      id="kanban-table-view-container"
      className="flex-1 overflow-y-auto overflow-x-auto p-4 flex flex-col gap-6 custom-scrollbar"
      style={{ backgroundColor: theme.ui.bgEditor }}
    >
      {/* Top Table View Bar Actions */}
      <div className="flex items-center justify-between gap-3 shrink-0 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAllSections}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border font-medium transition-colors hover:border-neutral-400"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : theme.ui.inputBg,
              borderColor: theme.ui.border,
              color: theme.ui.textMain,
            }}
          >
            {allCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            <span>{allCollapsed ? 'Expand All Sections' : 'Collapse All Sections'}</span>
          </button>

          <span className="text-xs" style={{ color: theme.ui.textMuted }}>
            {board.columns.length} section{board.columns.length === 1 ? '' : 's'} • {Object.keys(board.tasks).length} total tasks
          </span>
        </div>

        <button
          onClick={onStartAddColumn}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-colors shadow-2xs"
          style={{ backgroundColor: theme.isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)' }}
        >
          <Plus size={13} />
          <span>Add Section / Column</span>
        </button>
      </div>

      {/* Render each column as a table section */}
      {board.columns.map((column, colIndex) => {
        const colTaskIds = column.taskIds.filter((tId) => Boolean(board.tasks[tId]));
        const visibleTaskIds = colTaskIds.filter((tId) => filteredTasksMap[tId] !== false);
        const isCollapsed = Boolean(collapsedSections[column.id]);
        const isMenuOpen = activeMenuColId === column.id;

        return (
          <div
            key={column.id}
            id={`kanban-table-section-${column.id}`}
            className="rounded-lg border shadow-xs transition-colors overflow-hidden shrink-0"
            style={{
              backgroundColor: theme.ui.bgSidebar,
              borderColor: theme.ui.border,
            }}
          >
            {/* Section Header Bar */}
            <div
              className="px-4 py-2.5 flex items-center justify-between gap-3 border-b select-none transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                borderColor: theme.ui.border,
              }}
              onClick={() => toggleSectionCollapse(column.id)}
            >
              {/* Left: Collapse toggle, Color dot, Title, Count */}
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-white/10 text-neutral-400"
                  title={isCollapsed ? 'Expand section' : 'Collapse section'}
                >
                  {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                </button>

                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: column.color }}
                />

                <h3
                  className="text-xs font-semibold uppercase tracking-wider truncate"
                  style={{ color: theme.ui.textHeader }}
                >
                  {column.title}
                </h3>

                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border shrink-0"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    borderColor: theme.ui.border,
                    color: theme.ui.textMuted,
                  }}
                >
                  {visibleTaskIds.length} {visibleTaskIds.length === 1 ? 'task' : 'tasks'}
                  {visibleTaskIds.length !== colTaskIds.length ? ` (of ${colTaskIds.length})` : ''}
                </span>
              </div>

              {/* Right: Quick Add Task button & Column Actions menu */}
              <div
                className="flex items-center gap-1.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onCreateTask(column.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-400 hover:bg-blue-500/10 font-medium transition-colors"
                  title="Add task to this section"
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">Add Task</span>
                </button>

                {/* Column Action Dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuColId(isMenuOpen ? null : column.id);
                    }}
                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Section options"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {isMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1.5 w-52 rounded-md border shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                      style={{
                        backgroundColor: theme.ui.modalBg || theme.ui.bgSidebar,
                        borderColor: theme.ui.border,
                        color: theme.ui.textMain,
                      }}
                    >
                      <button
                        onClick={(e) => {
                          setActiveMenuColId(null);
                          onStartEditColumn(column, e);
                        }}
                        className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                      >
                        <Edit2 size={13} />
                        <span>Rename Section</span>
                      </button>

                      {/* Color Palette Selector */}
                      <div className="px-3 py-2 border-t border-b my-1" style={{ borderColor: theme.ui.border }}>
                        <span className="text-[10px] font-medium opacity-70 block mb-1.5">
                          Accent Color
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {COLOR_PALETTE.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={(e) => {
                                onUpdateColumnColor(column.id, c, e);
                                setActiveMenuColId(null);
                              }}
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

                      {/* Move section Up / Down */}
                      <div className="flex items-center px-1.5 py-1 gap-1">
                        <button
                          disabled={colIndex === 0}
                          onClick={(e) => {
                            onMoveColumn(column.id, 'left', e);
                            setActiveMenuColId(null);
                          }}
                          className="flex-1 px-2 py-1 text-[11px] rounded flex items-center justify-center gap-1 border disabled:opacity-30 disabled:pointer-events-none hover:bg-white/5 transition-colors"
                          style={{ borderColor: theme.ui.border }}
                          title="Move section up"
                        >
                          <ArrowUp size={11} />
                          <span>Move Up</span>
                        </button>
                        <button
                          disabled={colIndex === board.columns.length - 1}
                          onClick={(e) => {
                            onMoveColumn(column.id, 'right', e);
                            setActiveMenuColId(null);
                          }}
                          className="flex-1 px-2 py-1 text-[11px] rounded flex items-center justify-center gap-1 border disabled:opacity-30 disabled:pointer-events-none hover:bg-white/5 transition-colors"
                          style={{ borderColor: theme.ui.border }}
                          title="Move section down"
                        >
                          <ArrowDown size={11} />
                          <span>Move Down</span>
                        </button>
                      </div>

                      {/* Delete section */}
                      <button
                        onClick={(e) => {
                          setActiveMenuColId(null);
                          onDeleteColumn(column, e);
                        }}
                        className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={13} />
                        <span>Delete Section</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section Table Body (When not collapsed) */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className="border-b text-[11px] font-medium"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)',
                        borderColor: theme.ui.border,
                        color: theme.ui.textMuted,
                      }}
                    >
                      <th className="py-2 px-3.5 font-semibold w-[34%] min-w-[220px]">Task Name</th>
                      <th className="py-2 px-3 font-semibold w-[14%] min-w-[110px]">Priority</th>
                      <th className="py-2 px-3 font-semibold w-[14%] min-w-[120px]">Status</th>
                      <th className="py-2 px-3 font-semibold w-[13%] min-w-[110px]">Assignee</th>
                      <th className="py-2 px-3 font-semibold w-[12%] min-w-[110px]">Due Date</th>
                      <th className="py-2 px-3 font-semibold w-[13%] min-w-[120px]">Subtasks</th>
                      <th className="py-2 px-2.5 font-semibold text-right w-[60px]">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleTaskIds.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-6 text-center text-xs opacity-60 italic"
                          style={{ color: theme.ui.textMuted }}
                        >
                          No tasks in this section.
                        </td>
                      </tr>
                    ) : (
                      visibleTaskIds.map((taskId) => {
                        const task = board.tasks[taskId];
                        if (!task) return null;

                        const priorityInfo = getPriorityMeta(task.priority);
                        const subtaskStats = calculateSubtaskProgress(task.subtasks);
                        const dueInfo = formatDueDate(task.dueDate);
                        const isSubtasksExpanded = Boolean(expandedSubtaskTaskIds[task.id]);
                        const isEditingTitle = editingTaskTitleId === task.id;

                        return (
                          <React.Fragment key={task.id}>
                            <tr
                              className="group border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ borderColor: theme.ui.border }}
                            >
                              {/* 1. Task Name Column */}
                              <td className="py-2.5 px-3.5 align-middle">
                                {isEditingTitle ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editingTaskTitleValue}
                                      onChange={(e) => setEditingTaskTitleValue(e.target.value)}
                                      onBlur={() => handleSaveRenameTask(task.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveRenameTask(task.id);
                                        if (e.key === 'Escape') setEditingTaskTitleId(null);
                                      }}
                                      className="text-xs px-2 py-0.5 rounded border outline-none w-full shadow-2xs"
                                      style={{
                                        backgroundColor: theme.ui.inputBg,
                                        borderColor: '#3b82f6',
                                        color: theme.ui.textMain,
                                      }}
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveRenameTask(task.id)}
                                      className="p-1 text-emerald-400 hover:text-emerald-300"
                                      title="Save title"
                                    >
                                      <Check size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div
                                      onClick={() => onOpenTaskModal(task.id)}
                                      className="font-medium hover:text-blue-400 cursor-pointer transition-colors truncate max-w-[280px] sm:max-w-md"
                                      style={{ color: theme.ui.textMain }}
                                      title={task.title}
                                    >
                                      {task.title}
                                    </div>

                                    {/* Inline rename pen */}
                                    <button
                                      onClick={(e) => handleStartRenameTask(task, e)}
                                      className="opacity-0 group-hover:opacity-60 hover:opacity-100 p-0.5 rounded text-neutral-400 hover:text-white transition-opacity shrink-0"
                                      title="Rename task inline"
                                    >
                                      <Edit2 size={11} />
                                    </button>

                                    {/* Tag pills next to title */}
                                    {task.tags.length > 0 && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        {task.tags.slice(0, 2).map((tag) => {
                                          const tagColor = getTagColor(tag, board.customTags);
                                          return (
                                            <span
                                              key={tag}
                                              className="px-1.5 py-0.2 rounded text-[10px] font-medium border truncate max-w-[80px]"
                                              style={{
                                                backgroundColor: `${tagColor}15`,
                                                color: tagColor,
                                                borderColor: `${tagColor}40`,
                                              }}
                                            >
                                              {tag}
                                            </span>
                                          );
                                        })}
                                        {task.tags.length > 2 && (
                                          <span className="text-[10px] opacity-60">
                                            +{task.tags.length - 2}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* 2. Priority Column */}
                              <td className="py-2.5 px-3 align-middle">
                                <div className="relative inline-block">
                                  <select
                                    value={task.priority}
                                    onChange={(e) => handleChangePriority(task.id, e.target.value as KanbanPriority)}
                                    className={`text-[11px] font-medium px-2 py-0.5 rounded border appearance-none pr-5 cursor-pointer outline-none transition-colors ${priorityInfo.bgColor} ${priorityInfo.textColor} ${priorityInfo.borderColor}`}
                                  >
                                    <option value="urgent">🔴 Urgent</option>
                                    <option value="high">🟠 High</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="low">🔵 Low</option>
                                  </select>
                                  <ChevronsUpDown
                                    size={10}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
                                  />
                                </div>
                              </td>

                              {/* 3. Status / Column Column */}
                              <td className="py-2.5 px-3 align-middle">
                                <div className="relative inline-block max-w-[140px]">
                                  <select
                                    value={task.columnId}
                                    onChange={(e) => onMoveTaskToColumn(task.id, e.target.value)}
                                    className="text-[11px] font-medium px-2 py-0.5 rounded border appearance-none pr-5 cursor-pointer outline-none transition-colors truncate w-full"
                                    style={{
                                      backgroundColor: theme.ui.inputBg,
                                      borderColor: theme.ui.border,
                                      color: theme.ui.textMain,
                                    }}
                                  >
                                    {board.columns.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.title}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronsUpDown
                                    size={10}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
                                  />
                                </div>
                              </td>

                              {/* 4. Assignee Column */}
                              <td className="py-2.5 px-3 align-middle">
                                <div className="flex items-center gap-1.5">
                                  {task.assignee ? (
                                    <div
                                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border max-w-[120px] truncate"
                                      style={{
                                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                        borderColor: theme.ui.border,
                                        color: theme.ui.textMain,
                                      }}
                                    >
                                      <div
                                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                                        style={{ backgroundColor: '#6366f1', color: '#ffffff' }}
                                      >
                                        {task.assignee.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="truncate">{task.assignee}</span>
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder="Assign..."
                                      onBlur={(e) => handleChangeAssignee(task.id, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleChangeAssignee(task.id, (e.target as HTMLInputElement).value);
                                        }
                                      }}
                                      className="text-[11px] px-1.5 py-0.5 rounded border border-transparent hover:border-neutral-500 focus:border-blue-500 outline-none w-20 bg-transparent placeholder:opacity-40 transition-colors"
                                      style={{ color: theme.ui.textMain }}
                                    />
                                  )}
                                </div>
                              </td>

                              {/* 5. Due Date Column */}
                              <td className="py-2.5 px-3 align-middle">
                                <div className="flex items-center gap-1">
                                  {dueInfo ? (
                                    <div
                                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border font-medium ${
                                        dueInfo.isOverdue
                                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                          : dueInfo.isToday
                                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                          : dueInfo.isSoon
                                          ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                                          : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
                                      }`}
                                    >
                                      <Calendar size={11} className="shrink-0" />
                                      <span>{dueInfo.text}</span>
                                    </div>
                                  ) : (
                                    <input
                                      type="date"
                                      value={task.dueDate || ''}
                                      onChange={(e) => handleChangeDueDate(task.id, e.target.value)}
                                      className="text-[11px] px-1.5 py-0.5 rounded border border-transparent hover:border-neutral-500 focus:border-blue-500 outline-none w-24 bg-transparent cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                                      style={{ color: theme.ui.textMain }}
                                    />
                                  )}
                                </div>
                              </td>

                              {/* 6. Subtasks Column */}
                              <td className="py-2.5 px-3 align-middle">
                                {subtaskStats.total > 0 ? (
                                  <button
                                    onClick={(e) => toggleSubtasksExpanded(task.id, e)}
                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors hover:border-blue-500/50"
                                    style={{
                                      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                                      borderColor: theme.ui.border,
                                    }}
                                    title="Click to view & toggle subtasks"
                                  >
                                    {isSubtasksExpanded ? (
                                      <ChevronDown size={12} className="text-blue-400" />
                                    ) : (
                                      <ChevronRight size={12} className="text-neutral-400" />
                                    )}
                                    <div className="w-12 h-1.5 rounded-full bg-neutral-700 overflow-hidden shrink-0">
                                      <div
                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                        style={{ width: `${subtaskStats.percent}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-mono" style={{ color: theme.ui.textMuted }}>
                                      {subtaskStats.completed}/{subtaskStats.total}
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => onOpenTaskModal(task.id)}
                                    className="text-[11px] text-neutral-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                                  >
                                    <Plus size={11} />
                                    <span>Add subtasks</span>
                                  </button>
                                )}
                              </td>

                              {/* 7. Row Actions */}
                              <td className="py-2.5 px-2.5 align-middle text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => onOpenTaskModal(task.id)}
                                    className="p-1 rounded text-neutral-400 hover:text-blue-400 hover:bg-white/10 transition-colors"
                                    title="Open task details"
                                  >
                                    <ExternalLink size={13} />
                                  </button>
                                  <button
                                    onClick={() => onDeleteTask(task.id)}
                                    className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Delete task"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Subtasks Expanded Row */}
                            {isSubtasksExpanded && task.subtasks.length > 0 && (
                              <tr
                                className="border-b"
                                style={{
                                  backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                                  borderColor: theme.ui.border,
                                }}
                              >
                                <td colSpan={7} className="py-2 px-8">
                                  <div className="flex flex-col gap-1.5 max-w-xl">
                                    <div className="text-[11px] font-semibold tracking-wider uppercase opacity-60 mb-0.5">
                                      Subtasks Checklist:
                                    </div>
                                    {task.subtasks.map((sub) => (
                                      <div
                                        key={sub.id}
                                        onClick={(e) => handleToggleSubtask(task.id, sub.id, e)}
                                        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 cursor-pointer text-xs transition-colors"
                                      >
                                        {sub.completed ? (
                                          <CheckSquare size={13} className="text-emerald-500 shrink-0" />
                                        ) : (
                                          <Square size={13} className="text-neutral-500 shrink-0" />
                                        )}
                                        <span
                                          className={`truncate ${
                                            sub.completed ? 'line-through opacity-50' : 'opacity-90'
                                          }`}
                                          style={{ color: theme.ui.textMain }}
                                        >
                                          {sub.title}
                                        </span>
                                      </div>
                                    ))}

                                    {/* Inline Add Subtask input */}
                                    <div className="flex items-center gap-2 mt-1">
                                      <Plus size={12} className="opacity-40 shrink-0 ml-1" />
                                      <input
                                        type="text"
                                        placeholder="Add new subtask (press Enter)..."
                                        value={quickSubtaskInput[task.id] || ''}
                                        onChange={(e) =>
                                          setQuickSubtaskInput((prev) => ({
                                            ...prev,
                                            [task.id]: e.target.value,
                                          }))
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleAddSubtaskInline(task.id);
                                          }
                                        }}
                                        className="text-xs px-2 py-1 rounded border outline-none flex-1"
                                        style={{
                                          backgroundColor: theme.ui.inputBg,
                                          borderColor: theme.ui.border,
                                          color: theme.ui.textMain,
                                        }}
                                      />
                                      <button
                                        onClick={() => handleAddSubtaskInline(task.id)}
                                        className="px-2 py-1 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}

                    {/* Quick Add Row at bottom of Table Section */}
                    <tr
                      className="border-b"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
                        borderColor: theme.ui.border,
                      }}
                    >
                      <td colSpan={7} className="py-2 px-3.5">
                        <div className="flex items-center gap-2">
                          <Plus size={13} className="text-blue-500 shrink-0" />
                          <input
                            type="text"
                            placeholder={`+ Add task to ${column.title} (press Enter)...`}
                            value={sectionQuickAddTitles[column.id] || ''}
                            onChange={(e) =>
                              setSectionQuickAddTitles((prev) => ({
                                ...prev,
                                [column.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleQuickAddSubmit(column.id);
                              }
                            }}
                            className="text-xs px-2 py-1 rounded border outline-none flex-1 transition-colors focus:border-blue-500"
                            style={{
                              backgroundColor: theme.ui.inputBg,
                              borderColor: theme.ui.border,
                              color: theme.ui.textMain,
                            }}
                          />
                          {(sectionQuickAddTitles[column.id] || '').trim() && (
                            <button
                              onClick={() => handleQuickAddSubmit(column.id)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Add New Section Button At Bottom */}
      <div className="pt-2 pb-6 flex justify-center">
        <button
          onClick={onStartAddColumn}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-blue-400 hover:border-blue-400 transition-colors shadow-2xs"
          style={{ borderColor: theme.ui.border }}
        >
          <Plus size={14} />
          <span>+ Add Another Section / Column</span>
        </button>
      </div>
    </div>
  );
};
