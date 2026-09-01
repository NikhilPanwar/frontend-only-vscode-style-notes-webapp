import React, { useState } from 'react';
import {
  X,
  Calendar,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Tag as TagIcon,
  AlertCircle,
  Clock,
  User,
  CheckCircle2,
  ChevronDown,
  Layers,
  Flame,
  ArrowUp,
  Equal,
  ArrowDown,
} from 'lucide-react';
import {
  KanbanBoardData,
  KanbanPriority,
  KanbanSubtask,
  KanbanTag,
  KanbanTask,
  ThemeType,
} from '../types';
import { THEMES } from '../utils/themes';
import {
  COLOR_PALETTE,
  formatDueDate,
  generateKanbanId,
  getPriorityMeta,
  getTagColor,
  PRESET_TAG_COLORS,
} from '../utils/kanbanUtils';

interface KanbanTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: KanbanTask | null;
  board: KanbanBoardData;
  currentTheme: ThemeType;
  onSaveTask: (task: KanbanTask) => void;
  onDeleteTask: (taskId: string) => void;
}

export const KanbanTaskModal: React.FC<KanbanTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  board,
  currentTheme,
  onSaveTask,
  onDeleteTask,
}) => {
  const theme = THEMES[currentTheme];

  if (!isOpen || !task) return null;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<KanbanPriority>(task.priority);
  const [columnId, setColumnId] = useState<string>(task.columnId);
  const [dueDate, setDueDate] = useState<string>(task.dueDate || '');
  const [assignee, setAssignee] = useState<string>(task.assignee || '');
  const [tags, setTags] = useState<string[]>(task.tags || []);
  const [subtasks, setSubtasks] = useState<KanbanSubtask[]>(task.subtasks || []);

  // Tag creation & selection state
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLOR_PALETTE[0]);

  // Subtask input state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const priorityMeta = getPriorityMeta(priority);
  const formattedDue = formatDueDate(dueDate);

  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;
  const subtaskPercent = subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0;

  const handleSave = () => {
    if (!title.trim()) return;
    const updated: KanbanTask = {
      ...task,
      title: title.trim(),
      description: description.trim(),
      priority,
      columnId,
      dueDate: dueDate || undefined,
      assignee: assignee.trim() || undefined,
      tags,
      subtasks,
      updatedAt: Date.now(),
    };
    onSaveTask(updated);
    onClose();
  };

  const handleToggleSubtask = (subId: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: KanbanSubtask = {
      id: generateKanbanId('sub'),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setSubtasks((prev) => [...prev, newSub]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (subId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== subId));
  };

  const handleUpdateSubtaskTitle = (subId: string, text: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, title: text } : s))
    );
  };

  const handleToggleTag = (tagName: string) => {
    if (tags.includes(tagName)) {
      setTags((prev) => prev.filter((t) => t !== tagName));
    } else {
      setTags((prev) => [...prev, tagName]);
    }
  };

  const handleCreateCustomTag = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setNewTagName('');
    setIsAddingTag(false);
  };

  // Quick Due Date Shortcuts
  const setRelativeDueDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setDueDate(`${yyyy}-${mm}-${dd}`);
  };

  const allAvailableTags: { name: string; color: string }[] = [];
  const tagNamesSet = new Set<string>();

  // Add preset tags
  PRESET_TAG_COLORS.forEach((p) => {
    if (!tagNamesSet.has(p.name)) {
      tagNamesSet.add(p.name);
      allAvailableTags.push({ name: p.name, color: p.color });
    }
  });

  // Add board custom tags
  if (board.customTags) {
    board.customTags.forEach((t) => {
      if (!tagNamesSet.has(t.name)) {
        tagNamesSet.add(t.name);
        allAvailableTags.push({ name: t.name, color: t.color });
      }
    });
  }

  // Add task-specific tags
  tags.forEach((t) => {
    if (!tagNamesSet.has(t)) {
      tagNamesSet.add(t);
      allAvailableTags.push({ name: t, color: getTagColor(t, board.customTags) });
    }
  });

  return (
    <div
      id="kanban-task-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] rounded-lg shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        style={{
          backgroundColor: theme.ui.modalBg,
          borderColor: theme.ui.border,
          color: theme.ui.textMain,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-3.5 sm:px-5 py-3 sm:py-3.5 border-b shrink-0"
          style={{ borderColor: theme.ui.border }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: priorityMeta.color }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: theme.ui.textHeader }}
            >
              Task Details
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1 text-neutral-400 hover:text-red-400 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Delete Task"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-200 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5">
          {/* Task Title */}
          <div>
            <label
              className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: theme.ui.textMuted }}
            >
              Task Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement authentication middleware"
              className="w-full text-sm font-medium px-3 py-2 rounded border outline-none focus:border-blue-500 transition-colors"
              style={{
                backgroundColor: theme.ui.inputBg,
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
              autoFocus
            />
          </div>

          {/* Meta Controls Row: Status, Priority, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Status / Column */}
            <div>
              <label
                className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: theme.ui.textMuted }}
              >
                Status Column
              </label>
              <div className="relative">
                <select
                  value={columnId}
                  onChange={(e) => setColumnId(e.target.value)}
                  className="w-full text-xs font-medium px-2.5 py-2 rounded border appearance-none outline-none focus:border-blue-500 cursor-pointer"
                  style={{
                    backgroundColor: theme.ui.inputBg,
                    borderColor: theme.ui.border,
                    color: theme.ui.textMain,
                  }}
                >
                  {board.columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <label
                className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: theme.ui.textMuted }}
              >
                Priority
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as KanbanPriority)}
                  className="w-full text-xs font-medium px-2.5 py-2 rounded border appearance-none outline-none focus:border-blue-500 cursor-pointer"
                  style={{
                    backgroundColor: theme.ui.inputBg,
                    borderColor: theme.ui.border,
                    color: theme.ui.textMain,
                  }}
                >
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🔵 Low</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label
                className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: theme.ui.textMuted }}
              >
                Due Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs font-medium px-2.5 py-1.5 rounded border outline-none focus:border-blue-500"
                  style={{
                    backgroundColor: theme.ui.inputBg,
                    borderColor: theme.ui.border,
                    color: theme.ui.textMain,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Due Date Presets */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-medium mr-1" style={{ color: theme.ui.textMuted }}>Quick Date:</span>
            <button
              type="button"
              onClick={() => setRelativeDueDate(0)}
              className="px-2 py-0.5 rounded border hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ borderColor: theme.ui.border, color: theme.ui.textMain }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setRelativeDueDate(1)}
              className="px-2 py-0.5 rounded border hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ borderColor: theme.ui.border, color: theme.ui.textMain }}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setRelativeDueDate(7)}
              className="px-2 py-0.5 rounded border hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ borderColor: theme.ui.border, color: theme.ui.textMain }}
            >
              In 1 Week
            </button>
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="px-2 py-0.5 rounded text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors ml-auto font-medium"
              >
                Clear Date
              </button>
            )}
          </div>

          {/* Tags Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: theme.ui.textMuted }}
              >
                Colored Tags & Labels
              </label>
              <button
                type="button"
                onClick={() => setIsAddingTag(!isAddingTag)}
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
              >
                <Plus size={11} />
                {isAddingTag ? 'Cancel' : 'Create Custom Tag'}
              </button>
            </div>

            {/* Tag Creation Bar */}
            {isAddingTag && (
              <div
                className="p-3 mb-2.5 rounded border flex flex-col sm:flex-row items-center gap-2 text-xs"
                style={{ backgroundColor: theme.ui.bgSidebarHeader, borderColor: theme.ui.border }}
              >
                <input
                  type="text"
                  placeholder="New tag name (e.g. Database, API)"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1 px-2.5 py-1 rounded border outline-none text-xs w-full"
                  style={{
                    backgroundColor: theme.ui.inputBg,
                    borderColor: theme.ui.border,
                    color: theme.ui.textMain,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCustomTag();
                  }}
                />
                <div className="flex items-center gap-1">
                  {COLOR_PALETTE.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTagColor(c)}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        newTagColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCreateCustomTag}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-xs whitespace-nowrap"
                >
                  Add Tag
                </button>
              </div>
            )}

            {/* Available and selected tags pills */}
            <div className="flex flex-wrap gap-1.5">
              {allAvailableTags.map((tag) => {
                const isSelected = tags.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => handleToggleTag(tag.name)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all border ${
                      isSelected
                        ? 'ring-1 ring-white/40 shadow-xs'
                        : 'opacity-50 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: `${tag.color}25`,
                      color: tag.color,
                      borderColor: `${tag.color}40`,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                    {isSelected && <X size={11} className="ml-0.5 opacity-70 hover:opacity-100" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtasks Checklist Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: theme.ui.textMuted }}
              >
                <CheckSquare size={13} className="text-blue-400" />
                Subtasks ({completedSubtasksCount}/{subtasks.length})
              </label>
              {subtasks.length > 0 && (
                <span className="text-[11px] font-mono text-neutral-400">
                  {subtaskPercent}% completed
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {subtasks.length > 0 && (
              <div className="w-full h-1.5 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${subtaskPercent}%` }}
                />
              </div>
            )}

            {/* Subtasks List */}
            <div className="space-y-1.5 mb-2.5">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="group flex items-center gap-2 px-2.5 py-1.5 rounded border transition-colors"
                  style={{
                    backgroundColor: theme.ui.inputBg,
                    borderColor: theme.ui.border,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(st.id)}
                    className="shrink-0 text-neutral-400 hover:text-emerald-400 transition-colors"
                  >
                    {st.completed ? (
                      <CheckCircle2 size={15} className="text-emerald-500 fill-emerald-500/20" />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>

                  <input
                    type="text"
                    value={st.title}
                    onChange={(e) => handleUpdateSubtaskTitle(st.id, e.target.value)}
                    className={`flex-1 bg-transparent border-none outline-none text-xs ${
                      st.completed ? 'line-through opacity-50' : ''
                    }`}
                    style={{ color: theme.ui.textMain }}
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 p-0.5 rounded transition-opacity"
                    title="Remove subtask"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Subtask Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add a new subtask (press Enter)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 text-xs px-3 py-1.5 rounded border outline-none focus:border-blue-500 transition-colors"
                style={{
                  backgroundColor: theme.ui.inputBg,
                  borderColor: theme.ui.border,
                  color: theme.ui.textMain,
                }}
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded font-medium text-xs flex items-center gap-1 transition-colors"
              >
                <Plus size={13} />
                Add
              </button>
            </div>
          </div>

          {/* Description Section */}
          <div>
            <label
              className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: theme.ui.textMuted }}
            >
              Description & Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add detailed technical specifications, acceptance criteria, or context..."
              rows={3}
              className="w-full text-xs font-mono px-3 py-2 rounded border outline-none focus:border-blue-500 resize-y transition-colors"
              style={{
                backgroundColor: theme.ui.inputBg,
                borderColor: theme.ui.border,
                color: theme.ui.textMain,
              }}
            />
          </div>

          {/* Assignee / Team Member */}
          <div>
            <label
              className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: theme.ui.textMuted }}
            >
              Assignee
            </label>
            <div className="relative">
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Assignee name or initials (e.g. Alex R.)"
                className="w-full text-xs font-medium px-3 py-1.5 rounded border outline-none focus:border-blue-500"
                style={{
                  backgroundColor: theme.ui.inputBg,
                  borderColor: theme.ui.border,
                  color: theme.ui.textMain,
                }}
              />
              <User
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div
            className="p-4 border-t flex items-center justify-between bg-red-950/40 text-red-300 text-xs"
            style={{ borderColor: theme.ui.border }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <span>Are you sure you want to permanently delete this task?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1 text-xs rounded border border-neutral-600 hover:bg-neutral-800 text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(task.id);
                  onClose();
                }}
                className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded font-medium"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t shrink-0"
          style={{ borderColor: theme.ui.border, backgroundColor: theme.ui.bgSidebarHeader }}
        >
          <div className="text-[10px] text-neutral-400 font-mono">
            {task.createdAt ? `Created ${new Date(task.createdAt).toLocaleDateString()}` : ''}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded border hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium"
              style={{ borderColor: theme.ui.border, color: theme.ui.textMain }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded font-medium transition-colors shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
