import React, { useState, useRef, useEffect } from 'react';
import { Todo } from '../types';

interface TodoListProps {
  todos: Todo[];
  onUpdate: (todos: Todo[]) => void;
  isClientView?: boolean;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onUpdate, isClientView }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  if (isClientView) return null;

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        text: newTodoText.trim(),
        isCompleted: false,
      };
      onUpdate([...todos, newTodo]);
      setNewTodoText('');
    }
    // 계속 추가 모드 유지
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDownAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTodoText('');
    }
  };

  const handleToggleTodo = (id: string) => {
    const nextTodos = todos.map(t => 
      t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
    );
    onUpdate(nextTodos);
  };

  const handleDeleteTodo = (id: string) => {
    const nextTodos = todos.filter(t => t.id !== id);
    onUpdate(nextTodos);
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEditing = () => {
    if (editingId) {
      if (editText.trim()) {
        const nextTodos = todos.map(t => 
          t.id === editingId ? { ...t, text: editText.trim() } : t
        );
        onUpdate(nextTodos);
      } else {
        // 비어있으면 삭제? 아니면 취소? -> 취소로 처리
      }
      setEditingId(null);
      setEditText('');
    }
  };

  const handleKeyDownEdit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditing();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditText('');
    }
  };

  return (
    <div className="mt-3 mb-1 w-full" onClick={(e) => e.stopPropagation()}>
      {todos.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {todos.map(todo => (
            <div key={todo.id} className="group flex items-start gap-2 py-1 px-1 rounded hover:bg-slate-50 transition-colors min-h-[28px]">
              <button 
                onClick={() => handleToggleTodo(todo.id)}
                className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${
                  todo.isCompleted 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'bg-white border-slate-300 hover:border-blue-400'
                }`}
              >
                {todo.isCompleted && <i className="fa-solid fa-check text-white text-[9px]"></i>}
              </button>
              
              <div className="flex-1 min-w-0">
                {editingId === todo.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={saveEditing}
                    onKeyDown={handleKeyDownEdit}
                    className="w-full text-[13px] bg-white border border-blue-400 rounded px-1.5 py-0.5 outline-none text-black"
                  />
                ) : (
                  <span 
                    onClick={() => startEditing(todo)}
                    className={`block text-[13px] leading-snug cursor-text break-all ${
                      todo.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'
                    }`}
                  >
                    {todo.text}
                  </span>
                )}
              </div>

              <button
                onClick={() => handleDeleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"
                title="삭제"
              >
                <i className="fa-solid fa-xmark text-[12px]"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="flex items-center gap-2 px-1">
          <div className="w-4 h-4 rounded-full border-2 border-slate-200 bg-white"></div>
          <input
            ref={inputRef}
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onBlur={() => {
              if (!newTodoText.trim()) setIsAdding(false);
              else handleAddTodo();
            }}
            onKeyDown={handleKeyDownAdd}
            placeholder="할 일 입력..."
            className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-slate-400 text-black border-b border-blue-500 pb-0.5"
          />
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 text-[12px] font-bold text-slate-400 hover:text-blue-600 transition-colors px-1 py-1 rounded hover:bg-blue-50 w-full text-left group"
        >
          <i className="fa-solid fa-plus text-[10px] group-hover:scale-110 transition-transform"></i>
          <span>할 일 추가</span>
        </button>
      )}
    </div>
  );
};

export default TodoList;
