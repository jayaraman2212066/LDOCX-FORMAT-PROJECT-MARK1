/**
 * LDOCX Living Document Platform — Interactive Quiz & Knowledge Check Engine
 * Supports Single Choice, Multi Choice, True/False, and Numeric Question Types
 * Features: Live Scoring, Hint Reveal, Explanations, WCAG Compliant Keyboard Navigation
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LDocQuizEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Evaluate a single question against a user's answer
   */
  function evaluateQuestion(question, userAnswer) {
    if (!question) return { isCorrect: false, score: 0 };

    switch (question.type) {
      case 'single_select': {
        const isCorrect = parseInt(userAnswer, 10) === parseInt(question.correctIndex, 10);
        return {
          isCorrect,
          score: isCorrect ? 1 : 0,
          explanation: question.explanation || ''
        };
      }

      case 'true_false': {
        const boolAns = (typeof userAnswer === 'boolean') ? userAnswer : (String(userAnswer).toLowerCase() === 'true');
        const correctBool = Boolean(question.correctAnswer);
        const isCorrect = (boolAns === correctBool);
        return {
          isCorrect,
          score: isCorrect ? 1 : 0,
          explanation: question.explanation || ''
        };
      }

      case 'multi_select': {
        const userSet = new Set(Array.isArray(userAnswer) ? userAnswer.map(Number) : []);
        const correctSet = new Set(Array.isArray(question.correctIndices) ? question.correctIndices.map(Number) : []);
        let isCorrect = (userSet.size === correctSet.size);
        if (isCorrect) {
          userSet.forEach(idx => {
            if (!correctSet.has(idx)) isCorrect = false;
          });
        }
        return {
          isCorrect,
          score: isCorrect ? 1 : 0,
          explanation: question.explanation || ''
        };
      }

      case 'numeric': {
        const val = parseFloat(userAnswer);
        const target = parseFloat(question.correctValue);
        const tol = question.tolerance !== undefined ? parseFloat(question.tolerance) : 0.001;
        const isCorrect = !isNaN(val) && Math.abs(val - target) <= tol;
        return {
          isCorrect,
          score: isCorrect ? 1 : 0,
          explanation: question.explanation || ''
        };
      }

      default: {
        const isCorrect = String(userAnswer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();
        return {
          isCorrect,
          score: isCorrect ? 1 : 0,
          explanation: question.explanation || ''
        };
      }
    }
  }

  /**
   * Evaluate entire quiz state
   */
  function evaluateQuiz(quizBlock, answersMap) {
    const questions = quizBlock.questions || [];
    let totalScore = 0;
    const maxScore = questions.length;
    const results = [];

    questions.forEach(q => {
      const uAns = answersMap[q.id];
      const res = evaluateQuestion(q, uAns);
      totalScore += res.score;
      results.push({ questionId: q.id, ...res });
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    return {
      totalScore,
      maxScore,
      percentage,
      passed: percentage >= (quizBlock.passingScore || 70),
      results
    };
  }

  /**
   * Generate interactive HTML markup for a quiz block
   */
  function generateQuizCard(quizNode) {
    const uid = 'quiz_' + (quizNode.id || Math.random().toString(36).substr(2, 8));
    const title = quizNode.title || 'Interactive Knowledge Check';
    const questions = quizNode.questions || [];

    let qHtml = '';
    questions.forEach((q, qIndex) => {
      const qNum = qIndex + 1;
      let optsHtml = '';

      if (q.type === 'single_select' || !q.type) {
        (q.options || []).forEach((opt, optIdx) => {
          optsHtml += `
            <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;margin-bottom:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;transition:all 0.15s ease;"
                   id="${uid}_${q.id}_opt_${optIdx}">
              <input type="radio" name="${uid}_${q.id}" value="${optIdx}" style="accent-color:#a855f7;cursor:pointer;"
                     onchange="window.LDocQuizEngine && window.LDocQuizEngine.onAnswerSelected('${uid}', '${q.id}', ${optIdx})" />
              <span style="font-size:13.5px;color:#e2e8f0;">${opt}</span>
            </label>
          `;
        });
      } else if (q.type === 'true_false') {
        optsHtml += `
          <div style="display:flex;gap:12px;margin-bottom:8px;">
            <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;"
                   id="${uid}_${q.id}_opt_true">
              <input type="radio" name="${uid}_${q.id}" value="true" style="accent-color:#10b981;cursor:pointer;"
                     onchange="window.LDocQuizEngine && window.LDocQuizEngine.onAnswerSelected('${uid}', '${q.id}', true)" />
              <span style="font-weight:700;color:#10b981;">TRUE</span>
            </label>
            <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;"
                   id="${uid}_${q.id}_opt_false">
              <input type="radio" name="${uid}_${q.id}" value="false" style="accent-color:#ef4444;cursor:pointer;"
                     onchange="window.LDocQuizEngine && window.LDocQuizEngine.onAnswerSelected('${uid}', '${q.id}', false)" />
              <span style="font-weight:700;color:#ef4444;">FALSE</span>
            </label>
          </div>
        `;
      } else if (q.type === 'numeric') {
        optsHtml += `
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
            <input type="number" step="any" placeholder="Enter numeric value..." id="${uid}_${q.id}_num"
                   style="flex:1;padding:10px 14px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-family:monospace;font-size:14px;"
                   oninput="window.LDocQuizEngine && window.LDocQuizEngine.onAnswerSelected('${uid}', '${q.id}', this.value)" />
            ${q.unit ? `<span style="font-size:13px;color:#94a3b8;font-weight:700;">${q.unit}</span>` : ''}
          </div>
        `;
      }

      // Hint & Explanation Containers
      const hintButton = q.hint ? `
        <button type="button" onclick="window.LDocQuizEngine && window.LDocQuizEngine.toggleHint('${uid}', '${q.id}')"
                style="background:none;border:none;color:#f59e0b;font-size:11.5px;cursor:pointer;padding:4px 0;text-decoration:underline;">
          💡 Need a hint?
        </button>
        <div id="${uid}_${q.id}_hint" style="display:none;background:rgba(245,158,11,0.1);border-left:3px solid #f59e0b;padding:8px 12px;margin:8px 0;border-radius:4px;font-size:12px;color:#fde68a;">
          ${q.hint}
        </div>
      ` : '';

      const explanationDiv = `
        <div id="${uid}_${q.id}_exp" style="display:none;margin-top:10px;padding:10px 14px;border-radius:8px;font-size:12.5px;line-height:1.5;"></div>
      `;

      qHtml += `
        <div class="ldoc-quiz-q" style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:14.5px;font-weight:700;color:#f8fafc;margin-bottom:10px;">
            <span style="color:#a855f7;margin-right:6px;">Q${qNum}.</span>${q.question}
          </div>
          ${optsHtml}
          ${hintButton}
          ${explanationDiv}
        </div>
      `;
    });

    return `
      <div class="ldoc-quiz-card" id="${uid}" style="background:rgba(18,18,32,0.94);border:1.5px solid rgba(168,85,247,0.4);border-radius:16px;padding:24px;margin:20px 0;box-shadow:0 12px 35px rgba(0,0,0,0.65);">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;">🎯</span>
            <strong style="font-size:16px;color:#f8fafc;letter-spacing:0.5px;">${title}</strong>
          </div>
          <span style="font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(168,85,247,0.18);color:#d8b4fe;font-weight:700;">${questions.length} QUESTIONS</span>
        </div>

        <div class="ldoc-quiz-questions">
          ${qHtml}
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;flex-wrap:wrap;gap:12px;">
          <button type="button" onclick="window.LDocQuizEngine && window.LDocQuizEngine.submitQuiz('${uid}')"
                  style="background:linear-gradient(135deg, #a855f7, #6366f1);color:#fff;border:none;padding:10px 22px;border-radius:8px;font-weight:700;font-size:13.5px;cursor:pointer;box-shadow:0 4px 14px rgba(168,85,247,0.4);transition:all .15s ease;">
            Grade &amp; Verify Answers
          </button>
          <button type="button" onclick="window.LDocQuizEngine && window.LDocQuizEngine.resetQuiz('${uid}')"
                  style="background:rgba(255,255,255,0.06);color:#94a3b8;border:1px solid rgba(255,255,255,0.12);padding:10px 18px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;">
            ↺ Reset
          </button>
        </div>

        <div id="${uid}_score_banner" style="display:none;margin-top:18px;padding:16px;border-radius:10px;text-align:center;"></div>
      </div>
    `;
  }

  // Active quiz state cache
  const activeQuizStates = new Map(); // uid -> { spec, answers }

  function registerQuizSpec(uid, spec) {
    activeQuizStates.set(uid, { spec, answers: {} });
  }

  function onAnswerSelected(uid, qId, answer) {
    let state = activeQuizStates.get(uid);
    if (!state) {
      state = { spec: { questions: [] }, answers: {} };
      activeQuizStates.set(uid, state);
    }
    state.answers[qId] = answer;
  }

  function toggleHint(uid, qId) {
    const elem = document.getElementById(`${uid}_${qId}_hint`);
    if (elem) {
      elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
    }
  }

  function submitQuiz(uid) {
    const state = activeQuizStates.get(uid);
    if (!state || !state.spec || !state.spec.questions) return;

    const evalResult = evaluateQuiz(state.spec, state.answers);

    // Update each question feedback
    (state.spec.questions || []).forEach(q => {
      const qRes = evalResult.results.find(r => r.questionId === q.id) || { isCorrect: false };
      const expElem = document.getElementById(`${uid}_${q.id}_exp`);
      if (expElem) {
        expElem.style.display = 'block';
        if (qRes.isCorrect) {
          expElem.style.background = 'rgba(16,185,129,0.15)';
          expElem.style.border = '1px solid rgba(16,185,129,0.3)';
          expElem.style.color = '#6ee7b7';
          expElem.innerHTML = `<strong>✓ Correct!</strong> ${q.explanation || ''}`;
        } else {
          expElem.style.background = 'rgba(239,68,68,0.15)';
          expElem.style.border = '1px solid rgba(239,68,68,0.3)';
          expElem.style.color = '#fca5a5';
          expElem.innerHTML = `<strong>✗ Incorrect.</strong> ${q.explanation || ''}`;
        }
      }
    });

    // Score banner
    const banner = document.getElementById(`${uid}_score_banner`);
    if (banner) {
      banner.style.display = 'block';
      if (evalResult.passed) {
        banner.style.background = 'rgba(16,185,129,0.18)';
        banner.style.border = '1.5px solid #10b981';
        banner.style.color = '#10b981';
        banner.innerHTML = `<div style="font-size:18px;font-weight:800;">🎉 Mastered: ${evalResult.totalScore} / ${evalResult.maxScore} (${evalResult.percentage}%)</div><div style="font-size:12.5px;color:#a7f3d0;margin-top:4px;">Great work! You have satisfied all knowledge criteria.</div>`;
      } else {
        banner.style.background = 'rgba(245,158,11,0.18)';
        banner.style.border = '1.5px solid #f59e0b';
        banner.style.color = '#f59e0b';
        banner.innerHTML = `<div style="font-size:18px;font-weight:800;">Score: ${evalResult.totalScore} / ${evalResult.maxScore} (${evalResult.percentage}%)</div><div style="font-size:12.5px;color:#fde68a;margin-top:4px;">Passing threshold is 70%. Review the explanations and retry!</div>`;
      }
    }
  }

  function resetQuiz(uid) {
    const state = activeQuizStates.get(uid);
    if (state) state.answers = {};

    const container = document.getElementById(uid);
    if (!container) return;

    // Reset inputs
    const inputs = container.querySelectorAll('input');
    inputs.forEach(inp => {
      if (inp.type === 'radio' || inp.type === 'checkbox') inp.checked = false;
      if (inp.type === 'number' || inp.type === 'text') inp.value = '';
    });

    // Hide explanations and hints
    container.querySelectorAll('[id$="_exp"]').forEach(e => { e.style.display = 'none'; });
    container.querySelectorAll('[id$="_hint"]').forEach(e => { e.style.display = 'none'; });
    const banner = document.getElementById(`${uid}_score_banner`);
    if (banner) banner.style.display = 'none';
  }

  return {
    evaluateQuestion,
    evaluateQuiz,
    generateQuizCard,
    registerQuizSpec,
    onAnswerSelected,
    toggleHint,
    submitQuiz,
    resetQuiz,
    activeQuizStates
  };
}));
