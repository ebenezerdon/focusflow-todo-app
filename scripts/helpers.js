/* scripts/helpers.js
   Responsible for storage, id generation, and utility helpers
   Exposes window.AppStorage and utility functions for other modules
*/

(function(window, $){
  'use strict';

  const STORAGE_KEY = 'teda_todo_v1';

  const defaultBoard = {
    columns: [
      { id: 'todo', title: 'To Do' },
      { id: 'inprogress', title: 'In Progress' },
      { id: 'done', title: 'Done' }
    ],
    tasks: [
      { id: 'example_1', title: 'Plan your day', notes: 'Add a few tasks you care about and prioritize them.', done: false, priority: 'medium', column: 'todo', created: Date.now() },
      { id: 'example_2', title: 'Design hero section', notes: 'Sketch layout and gather assets.', done: false, priority: 'high', column: 'inprogress', created: Date.now() - 3600000 },
      { id: 'example_3', title: 'Weekly review', notes: 'Reflect on wins and blockers from the week.', done: true, priority: 'low', column: 'done', created: Date.now() - 86400000 }
    ]
  };

  function uid(prefix = 'id'){
    // simple unique id generator
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  }

  function load(){
    try{
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if(!raw) return JSON.parse(JSON.stringify(defaultBoard));
      return JSON.parse(raw);
    }catch(e){
      console.error('Failed to load storage', e);
      return JSON.parse(JSON.stringify(defaultBoard));
    }
  }

  function save(board){
    try{
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
      return true;
    }catch(e){
      console.error('Failed to save storage', e);
      return false;
    }
  }

  function formatDate(ts){
    if(!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString();
  }

  function clone(v){
    return JSON.parse(JSON.stringify(v));
  }

  // Expose under window.AppStorage
  window.AppStorage = window.AppStorage || {};
  window.AppStorage.load = load;
  window.AppStorage.save = save;
  window.AppStorage.uid = uid;
  window.AppStorage.formatDate = formatDate;
  window.AppStorage.clone = clone;
  window.AppStorage.STORAGE_KEY = STORAGE_KEY;

})(window, jQuery);
