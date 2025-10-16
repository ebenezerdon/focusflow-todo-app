/* scripts/ui.js
   Responsible for rendering UI, wiring events, and exposing App.init and App.render
   Defines window.App as required by contract
*/

(function(window, $){
  'use strict';
  window.App = window.App || {};

  // internal state
  const State = {
    board: null,
    selectedTaskForPick: null, // pick/drop mode for touch
    drag: { id: null }
  };

  // Helpers for template rendering
  function createColumnElement(col){
    // Robustly obtain the template content. Some environments may not expose
    // template.content via jQuery.prop('content'), so try a few fallbacks.
    var tplContent = null;
    var tplEl = document.getElementById('column-template');
    if (tplEl && tplEl.content && typeof tplEl.content.firstElementChild !== 'undefined') {
      tplContent = tplEl.content.firstElementChild.cloneNode(true);
    } else {
      // Fallback: try to read the template inner HTML and create an element
      var $raw = $('#column-template');
      if ($raw.length && $raw.html().trim()) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = $raw.html().trim();
        tplContent = wrapper.firstElementChild || wrapper;
        // clone to avoid reusing the live node
        tplContent = tplContent.cloneNode(true);
      } else {
        // Ultimate fallback: construct a minimal column element so the app can still render
        tplContent = document.createElement('section');
        tplContent.className = 'bg-white rounded-2xl p-4 shadow-sm border border-gray-100 h-full flex flex-col';
        tplContent.innerHTML = '<div class="flex items-center justify-between mb-3"><h3 class="font-semibold text-slate-800">Column</h3><div class="text-sm text-slate-500">0</div></div><div class="flex-1 overflow-auto space-y-3 column-drop" tabindex="0" role="list" aria-label="Column list"></div><div class="mt-3 text-center"><button class="btn-muted w-full add-in-column">Add here</button></div>';
      }
    }

    const tpl = tplContent;
    const $section = $(tpl);
    $section.find('h3').text(col.title);
    $section.find('.add-in-column').data('col-id', col.id);
    $section.find('.column-drop').attr('data-col-id', col.id);
    return $section;
  }

  function createTaskElement(task){
    // Robustly obtain the card template content. Some environments may not expose
    // template.content via jQuery.prop('content'), so try a few fallbacks similar
    // to createColumnElement.
    var tplContent = null;
    var tplEl = document.getElementById('card-template');
    if (tplEl && tplEl.content && typeof tplEl.content.firstElementChild !== 'undefined') {
      tplContent = tplEl.content.firstElementChild.cloneNode(true);
    } else {
      var $raw = $('#card-template');
      if ($raw.length && $raw.html().trim()) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = $raw.html().trim();
        tplContent = wrapper.firstElementChild || wrapper;
        // clone to avoid reusing the live node
        tplContent = tplContent.cloneNode(true);
      } else {
        // Ultimate fallback: construct a minimal card element so the app can still render
        tplContent = document.createElement('article');
        tplContent.className = 'card task-card';
        tplContent.setAttribute('draggable', 'true');
        tplContent.setAttribute('role', 'listitem');
        tplContent.setAttribute('tabindex', '0');
        tplContent.innerHTML = '<div class="flex items-start gap-3">' +
          '<input class="task-done-checkbox" type="checkbox" aria-label="Mark done" />' +
          '<div class="flex-1">' +
          '<div class="task-title font-medium"></div>' +
          '<div class="task-notes text-xs text-slate-500 mt-1"></div>' +
          '<div class="mt-2 flex items-center gap-2">' +
          '<div class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 priority-pill"></div>' +
          '<div class="text-xs text-slate-400 ml-auto"> ' +
          '<button class="btn-muted btn-edit text-xs" aria-label="Edit">Edit</button>' +
          '<button class="btn-muted btn-delete text-xs" aria-label="Delete">Delete</button>' +
          '<button class="btn-muted btn-pick text-xs sm:hidden" aria-label="Pick to move">Pick</button>' +
          '</div></div></div></div>';
      }
    }

    const tpl = tplContent;
    const $el = $(tpl);
    $el.attr('data-task-id', task.id);
    $el.find('.task-title').text(task.title || 'Untitled');
    $el.find('.task-notes').text(task.notes || '');
    $el.find('.priority-pill').text(task.priority || 'medium').attr('data-priority', task.priority || 'medium');
    $el.find('.task-done-checkbox').prop('checked', !!task.done);

    if(task.done){
      $el.addClass('opacity-60 line-through');
    }

    // Attach small controls
    $el.find('.btn-delete').on('click', function(e){
      e.stopPropagation();
      App.deleteTask(task.id);
    });

    $el.find('.btn-edit').on('click', function(e){
      e.stopPropagation();
      App.openEditModal(task.id);
    });

    // pick for mobile
    $el.find('.btn-pick').on('click', function(e){
      e.stopPropagation();
      if(State.selectedTaskForPick === task.id){
        State.selectedTaskForPick = null;
        App.render();
        return;
      }
      State.selectedTaskForPick = task.id;
      App.render();
    });

    // done checkbox
    $el.find('.task-done-checkbox').on('change', function(){
      App.toggleDone(task.id, $(this).is(':checked'));
    });

    // Drag events
    $el.on('dragstart', function(e){
      State.drag.id = task.id;
      $(this).addClass('dragging');
      try{ e.originalEvent.dataTransfer.setData('text/plain', task.id); }catch(err){}
    });
    $el.on('dragend', function(){
      State.drag.id = null;
      $(this).removeClass('dragging');
    });

    // keyboard accessibility: left/right to move, up/down to reorder
    $el.on('keydown', function(e){
      const key = e.key;
      if(key === 'ArrowLeft'){
        App.moveTaskLeft(task.id);
      } else if(key === 'ArrowRight'){
        App.moveTaskRight(task.id);
      } else if(key === 'Delete'){
        App.deleteTask(task.id);
      }
    });

    return $el;
  }

  // Render full board
  function renderBoard(filters){
    const $board = $('#board');
    $board.empty();
    State.board.columns.forEach(col => {
      const $col = createColumnElement(col);
      const $list = $col.find('.column-drop');

      // column header count
      const tasksInCol = State.board.tasks.filter(t => t.column === col.id);
      $col.find('.text-sm').first().text(tasksInCol.length + '');

      // render tasks with optional filters
      tasksInCol.forEach(task => {
        const matchesSearch = !filters.search || task.title.toLowerCase().includes(filters.search.toLowerCase()) || (task.notes||'').toLowerCase().includes(filters.search.toLowerCase());
        const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
        if(matchesSearch && matchesPriority){
          const $taskEl = createTaskElement(task);
          $list.append($taskEl);
        }
      });

      // Attach drop handlers
      $list.on('dragover', function(ev){
        ev.preventDefault();
        $(this).addClass('drag-over');
      });
      $list.on('dragleave drop', function(ev){
        ev.preventDefault();
        $(this).removeClass('drag-over');
      });

      $list.on('drop', function(ev){
        ev.preventDefault();
        let draggedId = null;
        try{ draggedId = ev.originalEvent.dataTransfer.getData('text/plain'); }catch(e){}
        if(!draggedId && State.drag.id) draggedId = State.drag.id;
        if(!draggedId && State.selectedTaskForPick){
          draggedId = State.selectedTaskForPick; // mobile pick/drop
          State.selectedTaskForPick = null;
        }
        if(draggedId){
          App.moveTaskToColumn(draggedId, $(this).attr('data-col-id'));
        }
      });

      // allow clicking 'Add here'
      $col.find('.add-in-column').on('click', function(){
        App.openNewModal(col.id);
      });

      $board.append($col);
    });

    // If pick mode active, indicate task selected
    if(State.selectedTaskForPick){
      $('[data-task-id]').removeClass('ring-2 ring-teal-200');
      $(`[data-task-id='${State.selectedTaskForPick}']`).addClass('ring-2 ring-teal-200');
    }
  }

  // Public methods on window.App
  App.init = function(){
    // load board state
    State.board = window.AppStorage.load();

    // wire top controls
    $('#add-task-btn').on('click', function(){ App.openNewModal(); });
    $('#clear-completed').on('click', function(){ App.clearCompleted(); });

    // modal handlers
    $('#modal-cancel').on('click', function(){ App.closeModal(); });
    $('#task-modal').on('click', function(e){ if(e.target === this) App.closeModal(); });

    $('#task-form').on('submit', function(e){
      e.preventDefault();
      const id = $('#task-form').data('editing');
      const data = {
        title: $('#task-title').val().trim(),
        notes: $('#task-notes').val().trim(),
        done: !!$('#task-done').is(':checked'),
        priority: $('#task-priority').val()
      };
      if(id){
        App.updateTask(id, data);
      } else {
        const col = $('#task-form').data('column') || 'todo';
        App.createTask(Object.assign({}, data, { column: col }));
      }
      App.closeModal();
    });

    // search/filter
    $('#search').on('input', function(){ App.render(); });
    $('#filter-priority').on('change', function(){ App.render(); });

    // keyboard global - Esc to close modal or cancel pick
    $(document).on('keydown', function(e){
      if(e.key === 'Escape'){
        if($('#task-modal').attr('aria-hidden') !== 'true') App.closeModal();
        else if(State.selectedTaskForPick){ State.selectedTaskForPick = null; App.render(); }
      }
    });

    // initialize dragover on board to allow dropping to empty columns
    $('#board').on('dragover', '.column-drop', function(e){ e.preventDefault(); });

    return true;
  };

  App.render = function(){
    const filters = { search: $('#search').val() || '', priority: $('#filter-priority').val() || 'all' };
    renderBoard(filters);
  };

  /* Task operations */
  App.createTask = function(task){
    try{
      const t = window.AppStorage.clone(task);
      t.id = window.AppStorage.uid('task');
      t.created = Date.now();
      t.column = t.column || 'todo';
      t.done = !!t.done;
      t.priority = t.priority || 'medium';
      State.board.tasks.push(t);
      window.AppStorage.save(State.board);
      App.render();
    }catch(e){ console.error('createTask failed', e); }
  };

  App.updateTask = function(id, data){
    try{
      const idx = State.board.tasks.findIndex(t => t.id === id);
      if(idx === -1) return;
      const task = State.board.tasks[idx];
      Object.assign(task, data);
      window.AppStorage.save(State.board);
      App.render();
    }catch(e){ console.error('updateTask failed', e); }
  };

  App.deleteTask = function(id){
    if(!confirm('Delete this task?')) return;
    State.board.tasks = State.board.tasks.filter(t => t.id !== id);
    window.AppStorage.save(State.board);
    App.render();
  };

  App.toggleDone = function(id, done){
    const t = State.board.tasks.find(x => x.id === id);
    if(!t) return;
    t.done = done;
    window.AppStorage.save(State.board);
    App.render();
  };

  App.moveTaskToColumn = function(id, columnId){
    const t = State.board.tasks.find(x => x.id === id);
    if(!t) return;
    t.column = columnId;
    // move to end of column
    const others = State.board.tasks.filter(x => x.id !== id);
    // maintain order: remove and push to end
    State.board.tasks = others.concat([t]);
    window.AppStorage.save(State.board);
    App.render();
  };

  App.moveTaskLeft = function(id){
    const task = State.board.tasks.find(t => t.id === id);
    if(!task) return;
    const cols = State.board.columns.map(c => c.id);
    const idx = cols.indexOf(task.column);
    if(idx > 0){
      App.moveTaskToColumn(id, cols[idx-1]);
    }
  };

  App.moveTaskRight = function(id){
    const task = State.board.tasks.find(t => t.id === id);
    if(!task) return;
    const cols = State.board.columns.map(c => c.id);
    const idx = cols.indexOf(task.column);
    if(idx < cols.length - 1){
      App.moveTaskToColumn(id, cols[idx+1]);
    }
  };

  App.openNewModal = function(column){
    $('#task-form').trigger('reset');
    $('#task-form').removeData('editing');
    $('#task-form').data('column', column || null);
    $('#modal-title').text('New Task');
    $('#task-modal').attr('aria-hidden', 'false');
    $('#task-title').trigger('focus');
  };

  App.openEditModal = function(id){
    const t = State.board.tasks.find(x => x.id === id);
    if(!t) return;
    $('#task-title').val(t.title);
    $('#task-notes').val(t.notes || '');
    $('#task-done').prop('checked', !!t.done);
    $('#task-priority').val(t.priority || 'medium');
    $('#task-form').data('editing', id);
    $('#task-form').removeData('column');
    $('#modal-title').text('Edit Task');
    $('#task-modal').attr('aria-hidden', 'false');
    $('#task-title').trigger('focus');
  };

  App.closeModal = function(){
    $('#task-modal').attr('aria-hidden', 'true');
    $('#task-form').removeData('editing');
    $('#task-form').removeData('column');
  };

  App.clearCompleted = function(){
    if(!confirm('Remove all completed tasks?')) return;
    State.board.tasks = State.board.tasks.filter(t => !t.done);
    window.AppStorage.save(State.board);
    App.render();
  };

  // expose AppStorage read-only view for debugging convenience
  App.getState = function(){ return window.AppStorage.clone(State); };

  // Ensure UI init when script loads but do not auto-start; main.js will call App.init

})(window, jQuery);
