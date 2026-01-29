// Task completion verification test
import { describe, it, expect, beforeEach } from 'vitest';
import { Role } from '../types';
import type { Task } from '../types';

describe('Task Completion Status', () => {
  let testTasks: Task[];

  beforeEach(() => {
    testTasks = [
      { id: 'task1', title: 'Task 1', roles: [Role.PM], description: '' },
      { id: 'task2', title: 'Task 2', roles: [Role.PM], description: '' },
      { id: 'task3', title: 'Task 3', roles: [Role.PM], description: '' },
    ];
  });

  it('should mark tasks as completed when in completedTasks set', () => {
    const completedTasks = new Set<string>(['task1', 'task2']);
    
    testTasks.forEach(task => {
      const isCompleted = completedTasks.has(task.id);
      
      if (task.id === 'task1') {
        expect(isCompleted).toBe(true);
      } else if (task.id === 'task2') {
        expect(isCompleted).toBe(true);
      } else if (task.id === 'task3') {
        expect(isCompleted).toBe(false);
      }
    });
  });

  it('should update completion status correctly', () => {
    let completedTasks = new Set<string>();
    
    // Mark task1 as completed
    completedTasks.add('task1');
    expect(completedTasks.has('task1')).toBe(true);
    expect(completedTasks.has('task2')).toBe(false);
    
    // Mark task2 as completed
    completedTasks.add('task2');
    expect(completedTasks.has('task1')).toBe(true);
    expect(completedTasks.has('task2')).toBe(true);
    
    // Unmark task1
    completedTasks.delete('task1');
    expect(completedTasks.has('task1')).toBe(false);
    expect(completedTasks.has('task2')).toBe(true);
  });

  it('should handle role filtering correctly', () => {
    const completedTasks = new Set<string>(['task1', 'task2']);
    const filter = Role.PM;
    
    const visibleTasks = testTasks.filter(task => {
      const tRoles = task.roles || [];
      return tRoles.length === 0 || tRoles.includes(Role.ALL) || tRoles.includes(filter);
    });
    
    expect(visibleTasks.length).toBe(3);
  });

  it('should calculate completion percentage correctly', () => {
    const completedTasks = new Set<string>(['task1', 'task2']);
    const visibleTasks = testTasks;
    const total = visibleTasks.length;
    const completed = visibleTasks.filter(task => completedTasks.has(task.id)).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    expect(percent).toBe(67); // 2 of 3 tasks completed
  });

  it('should show 100% when all tasks completed', () => {
    const completedTasks = new Set<string>(['task1', 'task2', 'task3']);
    const visibleTasks = testTasks;
    const total = visibleTasks.length;
    const completed = visibleTasks.filter(task => completedTasks.has(task.id)).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    expect(percent).toBe(100);
  });

  it('should handle empty task list', () => {
    const completedTasks = new Set<string>();
    const visibleTasks: Task[] = [];
    const total = visibleTasks.length;
    const completed = visibleTasks.filter(task => completedTasks.has(task.id)).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    expect(percent).toBe(0);
    expect(completed).toBe(0);
  });
});
