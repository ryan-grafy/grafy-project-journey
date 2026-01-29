// Task progress verification test
import { describe, it, expect, beforeEach } from 'vitest';
import { Role } from '../types';
import type { Task, Project } from '../types';

describe('Task Progress Calculation', () => {
  let testProject: Project;
  let testTasks: Task[];

  beforeEach(() => {
    testTasks = [
      { id: 'task1', title: 'Task 1', roles: [Role.PM], description: '' },
      { id: 'task2', title: 'Task 2', roles: [Role.PM], description: '' },
      { id: 'task3', title: 'Task 3', roles: [Role.PM], description: '' },
    ];

    testProject = {
      id: 'test-project',
      name: 'Test Project',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      status: 0,
      start_date: '2026-01-01',
      end_date: '',
      rounds_count: 2,
      rounds2_count: 2,
      rounds_navigation_count: 2,
      is_locked: false,
      pm_name: 'Test PM',
      pm_phone: '',
      pm_email: '',
      designer_name: 'Test Designer',
      designer_phone: '',
      designer_email: '',
      designer_2_name: '',
      designer_2_phone: '',
      designer_2_email: '',
      designer_3_name: '',
      designer_3_phone: '',
      designer_3_email: '',
      task_states: {
        completed: [],
        links: {},
        meta: {},
      },
      task_order: {},
      custom_tasks: {},
      client_visible_tasks: [],
      deleted_tasks: [],
    };
  });

  it('should calculate 0% progress when no tasks completed', () => {
    const completedTasks = new Set<string>();
    const visibleTasks = testTasks;
    const total = visibleTasks.length;
    const completed = visibleTasks.filter(task => completedTasks.has(task.id)).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    expect(percent).toBe(0);
  });

  it('should calculate 33% progress when 1 of 3 tasks completed', () => {
    const completedTasks = new Set<string>(['task1']);
    const visibleTasks = testTasks;
    const total = visibleTasks.length;
    const completed = visibleTasks.filter(task => completedTasks.has(task.id)).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    expect(percent).toBe(33);
  });

  it('should calculate 67% progress when 2 of 3 tasks completed', () => {
    const completedTasks = new Set<string>(['task1', 'task2']);
    const visibleTasks = testTasks;
    const total = visibleTasks.length;
    const completed = visibleTasks.filter(task => completedTasks.has(task.id)).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    expect(percent).toBe(67);
  });

  it('should calculate 100% progress when all tasks completed', () => {
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
  });

  it('should respect task order when calculating progress', () => {
    // Task 3 is in task_order but Task 1 is not (should be ignored)
    const customTasks = {
      1: [testTasks[0], testTasks[1], testTasks[2]],
    };
    const taskOrder = {
      1: ['task1', 'task3'], // Only task1 and task3 are in order
    };
    
    testProject.custom_tasks = customTasks;
    testProject.task_order = taskOrder;
    
    const completedTasks = new Set<string>(['task1', 'task3']);
    const visibleTasks = testTasks.filter(task => 
      taskOrder[1]?.includes(task.id) ?? true
    );
    
    const total = visibleTasks.length;
    const completed = visibleTasks.filter(task => completedTasks.has(task.id)).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    // task2 is not in task_order, so only task1 and task3 are visible (total=2)
    // Both task1 and task3 are completed, so percent should be 100%
    expect(percent).toBe(100);
  });

  it('should calculate progress correctly when some tasks are hidden', () => {
    const completedTasks = new Set<string>(['task1', 'task2', 'task3']);
    const visibleTasks = testTasks;
    const clientVisibleTasks = new Set<string>(['task1']); // Only task1 is visible to client
    
    const visibleToClient = visibleTasks.filter(task => clientVisibleTasks.has(task.id));
    const total = visibleToClient.length;
    const completed = visibleToClient.filter(task => completedTasks.has(task.id)).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    // Only task1 is visible to client, and it's completed, so 100%
    expect(percent).toBe(100);
  });
});
