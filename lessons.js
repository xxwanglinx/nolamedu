// Lightweight lessons progress module using localStorage
(function(){
  function storageKey(course){ return 'progress:' + course; }

  function getProgress(course){
    try { return JSON.parse(localStorage.getItem(storageKey(course)) || '{}'); }
    catch(e){ return {}; }
  }

  function saveProgress(course, obj){
    localStorage.setItem(storageKey(course), JSON.stringify(obj));
  }

  function markComplete(course, lesson){
    const p = getProgress(course);
    p[lesson] = true;
    saveProgress(course, p);
    renderProgress(course);
  }

  function markIncomplete(course, lesson){
    const p = getProgress(course);
    delete p[lesson];
    saveProgress(course, p);
    renderProgress(course);
  }

  function renderProgress(course){
    const p = getProgress(course);
    const total = document.querySelectorAll('[data-course="'+course+'"]').length || 25;
    const done = Object.keys(p).length;
    const pct = Math.round((done/total)*100);
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    if(fill) fill.style.width = pct + '%';
    if(text) text.textContent = done + ' / ' + total + ' lessons completed';
  }

  // On lesson pages, wire up button
  document.addEventListener('DOMContentLoaded', function(){
    const lessonRoot = document.getElementById('lesson-root');
    if(lessonRoot){
      // Insert a standard instruction prompting students to do the exercises
      if(!lessonRoot.querySelector('.exercise-instruction')){
        const instr = document.createElement('p');
        instr.className = 'exercise-instruction';
        instr.textContent = 'Instruction: Complete the exercises for this lesson to practice and reinforce learning.';
        const h2 = lessonRoot.querySelector('h2');
        if(h2 && h2.nextElementSibling) h2.parentNode.insertBefore(instr, h2.nextElementSibling);
        else lessonRoot.insertBefore(instr, lessonRoot.firstChild);
      }
      const course = lessonRoot.dataset.course;
      const lesson = lessonRoot.datasetLesson || lessonRoot.dataset.lesson;
      const btn = document.getElementById('mark-complete');
      const toggle = document.getElementById('toggle-complete');
      function updateButton(){
        const p = getProgress(course);
        const done = !!p[lesson];
        if(btn) btn.textContent = done ? 'Mark as incomplete' : 'Mark complete';
        if(toggle) toggle.checked = !!done;
      }
      updateButton();
      if(btn){
        btn.addEventListener('click', function(){
          const p = getProgress(course);
          if(p[lesson]){ markIncomplete(course, lesson); }
          else { markComplete(course, lesson); }
          updateButton();
        });
      }
      if(toggle){
        toggle.addEventListener('change', function(e){
          if(e.target.checked) markComplete(course, lesson); else markIncomplete(course, lesson);
          updateButton();
        });
      }
    }

    // render progress on course overview pages where present
    const progressContainers = document.querySelectorAll('[data-course]');
    if(progressContainers.length){
      // assume single course id on page, take first
      const course = progressContainers[0].dataset.course;
      renderProgress(course);
    }
  });

  // Expose helpers for manual use
  window.Lessons = { getProgress, markComplete, markIncomplete, renderProgress };
})();
