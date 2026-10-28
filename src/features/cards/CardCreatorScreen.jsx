import {
  IconArrowRight,
  IconCards,
  IconChevronDown,
  IconEdit,
  IconFlame,
  IconPlus,
  IconSparkles,
} from "../../components/icons.jsx";
import React from "react";
export function CardCreatorScreen({
  creatorAlternates,
  creatorAnswer,
  creatorCardAddedAnimation,
  creatorCorrectIndex,
  creatorEditingCardId,
  creatorHint,
  creatorOptions,
  creatorPrompt,
  creatorSessionCount,
  creatorShowAlternates,
  creatorShowHint,
  creatorStep,
  creatorTargetDeckId,
  creatorType,
  decks,
  handleOpenAiGenerator,
  handleSaveBombcard,
  setActiveTab,
  setCreatorAlternates,
  setCreatorAnswer,
  setCreatorCorrectIndex,
  setCreatorEditingCardId,
  setCreatorHint,
  setCreatorOptions,
  setCreatorPrompt,
  setCreatorShowAlternates,
  setCreatorShowHint,
  setCreatorStep,
  setCreatorTargetDeckId,
  setCreatorType,
  setSelectedDeckForFolderView,
  setSelectedDeckIds,
  triggerToast,
}) {
  return (() => {
    const currentTargetDeck =
      decks.find((d) => d.id === creatorTargetDeckId) || decks[0];
    const deckCards = currentTargetDeck?.cards || [];
    const mcqCards = deckCards.filter((c) => c.type === "MULTIPLE_CHOICE");
    const idCards = deckCards.filter((c) => c.type === "IDENTIFICATION");
    return (
      <div className="csm-screen csm-creator-screen custom-scroll">
        <div className="csm-studio-container">
          {/* 1. Header */}
          <div className="csm-page-head mb-5">
            <div>
              <span className="csm-kicker flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f04824] animate-pulse"></span>
                BOMBCARD STUDIO
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {creatorEditingCardId ? "Edit Bombcard" : "Create Bombcards"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {creatorEditingCardId
                  ? "Update the question, answer, or study details for this Bombcard."
                  : "Craft high-retention questions step-by-step for your reviewer deck."}
              </p>
            </div>
            <div className="csm-page-actions flex items-center gap-2.5">
              <button
                type="button"
                className="csm-secondary-button"
                onClick={() => {
                  if (!creatorEditingCardId) setSelectedDeckForFolderView(null);
                  setCreatorEditingCardId(null);
                  setActiveTab("library");
                }}
              >
                {creatorEditingCardId ? "Back to Deck" : "Back to Library"}
              </button>
              <button
                type="button"
                className="csm-primary-button"
                onClick={() => {
                  if (currentTargetDeck)
                    setSelectedDeckIds([currentTargetDeck.id]);
                  setActiveTab("flashcards");
                }}
              >
                Go to Study <IconArrowRight />
              </button>
            </div>
          </div>

          {/* 2. Compact Studio Context & Control Bar */}
          <div className="csm-studio-control-bar">
            {/* Left: Deck Context Selector */}
            <div className="flex items-center gap-2">
              <label className="csm-studio-deck-pill">
                <span className="text-[11px] font-bold text-slate-400">
                  {creatorEditingCardId ? "Editing in:" : "Creating in:"}
                </span>
                <select
                  value={creatorTargetDeckId}
                  onChange={(e) => setCreatorTargetDeckId(e.target.value)}
                  disabled={Boolean(creatorEditingCardId)}
                  aria-label={
                    creatorEditingCardId
                      ? "Deck containing the Bombcard being edited"
                      : "Deck for new Bombcards"
                  }
                  className="csm-studio-deck-select"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.title || d.subject}
                    </option>
                  ))}
                </select>
                <IconChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </label>
              <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                {deckCards.length} cards
              </span>
            </div>

            {/* Center: Interactive Question Format Switcher */}
            <div className="csm-studio-type-selector" role="tablist">
              <button
                type="button"
                onClick={() => setCreatorType("MULTIPLE_CHOICE")}
                className={`csm-studio-type-btn ${creatorType === "MULTIPLE_CHOICE" ? "active" : ""}`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="6" cy="6" r="2" fill="currentColor" />
                  <circle cx="18" cy="6" r="2" fill="currentColor" />
                  <circle cx="6" cy="18" r="2" fill="currentColor" />
                  <circle cx="18" cy="18" r="2" fill="currentColor" />
                </svg>
                Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => setCreatorType("TRUE_FALSE")}
                className={`csm-studio-type-btn ${creatorType === "TRUE_FALSE" ? "active" : ""}`}
              >
                <span className="text-[11px] font-black">T/F</span>
                True / False
              </button>
              <button
                type="button"
                onClick={() => setCreatorType("IDENTIFICATION")}
                className={`csm-studio-type-btn ${creatorType === "IDENTIFICATION" ? "active" : ""}`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="14" y2="12" />
                  <line x1="4" y1="17" x2="18" y2="17" />
                </svg>
                Identification
              </button>
            </div>

            {/* Right: Session Tracker & AI Generator Trigger */}
            <div className="flex items-center gap-2">
              {creatorSessionCount > 0 && (
                <span className="text-[11px] font-extrabold text-[#f04824] bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full flex items-center gap-1.5 animate-fadeIn">
                  <IconFlame /> {creatorSessionCount} created this session
                </span>
              )}
              <button
                type="button"
                onClick={() => handleOpenAiGenerator(currentTargetDeck?.id)}
                className="text-[11px] font-extrabold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/90 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                title="Generate flashcards with Gemini AI"
              >
                <IconSparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>AI Generator</span>
              </button>
            </div>
          </div>

          {/* 3. Main Studio Workspace Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Interactive Card Builder */}
            <div className="lg:col-span-8">
              <div className="csm-studio-card">
                {/* Top Bar of the Studio Card */}
                <div className="csm-studio-card-head">
                  <div className="csm-studio-steps">
                    <button
                      type="button"
                      onClick={() => setCreatorStep(1)}
                      className={`csm-studio-step-tab ${creatorStep === 1 ? "active" : creatorPrompt.trim() ? "completed" : ""}`}
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-slate-200/80 text-slate-700">
                        {creatorPrompt.trim() ? "✓" : "1"}
                      </span>
                      Question
                    </button>
                    <svg
                      className="w-3.5 h-3.5 text-slate-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <button
                      type="button"
                      onClick={() => {
                        if (!creatorPrompt.trim()) {
                          triggerToast(
                            "Please write the question prompt first.",
                          );
                          return;
                        }
                        setCreatorStep(2);
                      }}
                      className={`csm-studio-step-tab ${creatorStep === 2 ? "active" : ""}`}
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-slate-200/80 text-slate-700">
                        2
                      </span>
                      Answers & Details
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                      {creatorType === "MULTIPLE_CHOICE"
                        ? "4-Choice MCQ"
                        : creatorType === "TRUE_FALSE"
                          ? "True / False"
                          : "Identification"}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 md:p-8">
                  {creatorStep === 1 /* --- STEP 1: THE QUESTION --- */ ? (
                    <div className="animate-fadeIn">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Write Your Question *
                        </label>
                        <span className="text-[11px] font-semibold text-slate-400">
                          Step 1 of 2
                        </span>
                      </div>

                      <div className="relative">
                        <textarea
                          value={creatorPrompt}
                          onChange={(e) => setCreatorPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              (e.ctrlKey || e.metaKey || !e.shiftKey)
                            ) {
                              if (creatorPrompt.trim()) {
                                e.preventDefault();
                                setCreatorStep(2);
                              }
                            }
                          }}
                          autoFocus
                          placeholder="e.g. Which SQL command removes all rows from a table without logging individual row deletions?"
                          rows="4"
                          className="w-full p-4 bg-[#f8fafc] border-2 border-slate-200/90 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-[#f04824] focus:bg-white resize-none transition-all leading-relaxed"
                        />
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                          Press{" "}
                          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600">
                            Enter
                          </kbd>{" "}
                          to continue
                        </span>
                        <button
                          type="button"
                          disabled={!creatorPrompt.trim()}
                          onClick={() => setCreatorStep(2)}
                          className={`h-10 px-5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${creatorPrompt.trim() ? "bg-[#f04824] hover:bg-[#e03e1b] text-white shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                        >
                          Next: Set Answers
                          <IconArrowRight />
                        </button>
                      </div>
                    </div> /* --- STEP 2: ANSWERS & DETAILS --- */
                  ) : (
                    <div className="animate-fadeIn">
                      {/* Question Summary Bar */}
                      <div className="csm-studio-q-summary">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#f04824] flex-shrink-0">
                            Q
                          </span>
                          <p
                            className="text-xs font-bold text-slate-800 truncate"
                            title={creatorPrompt}
                          >
                            {creatorPrompt}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCreatorStep(1)}
                          className="text-[11px] font-bold text-[#f04824] hover:underline flex-shrink-0 ml-2"
                        >
                          Edit Question
                        </button>
                      </div>

                      {/* Options Area */}
                      {creatorType === "MULTIPLE_CHOICE" ? (
                        <div className="space-y-3 mb-5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                              Answer Options *
                            </label>
                            <span className="text-[11px] font-semibold text-[#f04824]">
                              Click any option letter to mark as correct
                            </span>
                          </div>

                          {creatorOptions.map((opt, idx) => {
                            const isCorrect = creatorCorrectIndex === idx;
                            const letter = String.fromCharCode(65 + idx);
                            return (
                              <div
                                key={idx}
                                onClick={() => setCreatorCorrectIndex(idx)}
                                className={`csm-studio-option-row cursor-pointer ${isCorrect ? "is-correct" : ""}`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCreatorCorrectIndex(idx);
                                  }}
                                  className="csm-studio-letter-badge"
                                  title="Designate as correct answer"
                                >
                                  {isCorrect ? "✓" : letter}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const updated = [...creatorOptions];
                                    updated[idx] = e.target.value;
                                    setCreatorOptions(updated);
                                  }}
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === "Enter" &&
                                      (e.ctrlKey || e.metaKey)
                                    ) {
                                      handleSaveBombcard();
                                    }
                                  }}
                                  placeholder={`Option ${letter}${isCorrect ? " (Write the correct answer here)" : ""}`}
                                  className="flex-1 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder-slate-400"
                                />
                                {isCorrect ? (
                                  <span className="text-[10px] font-black uppercase tracking-wider text-[#f04824] bg-white px-2 py-0.5 rounded-md border border-orange-200/80 shadow-xs flex-shrink-0">
                                    Correct Choice
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCreatorCorrectIndex(idx);
                                    }}
                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded flex-shrink-0 transition-colors"
                                  >
                                    Mark correct
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : creatorType === "TRUE_FALSE" ? (
                        <div className="space-y-3 mb-5">
                          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                            Correct Answer *
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            {["True", "False"].map((value) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setCreatorAnswer(value)}
                                className={`h-14 rounded-xl border-2 text-sm font-extrabold transition-all ${creatorAnswer === value ? "border-[#f04824] bg-orange-50 text-[#f04824]" : "border-slate-200 bg-[#f8fafc] text-slate-600 hover:border-slate-300"}`}
                              >
                                {value}
                              </button>
                            ))}
                          </div>
                        </div> /* Identification Answer */
                      ) : (
                        <div className="space-y-4 mb-5">
                          <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-1.5">
                              Target Correct Answer *
                            </label>
                            <input
                              type="text"
                              value={creatorAnswer}
                              onChange={(e) => setCreatorAnswer(e.target.value)}
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  (e.ctrlKey || e.metaKey)
                                ) {
                                  handleSaveBombcard();
                                }
                              }}
                              autoFocus
                              placeholder="e.g. TRUNCATE"
                              className="w-full h-11 px-4 bg-[#f8fafc] border-2 border-slate-200/90 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#f04824] focus:bg-white transition-all"
                            />
                          </div>

                          {!creatorShowAlternates && !creatorAlternates ? (
                            <button
                              type="button"
                              onClick={() => setCreatorShowAlternates(true)}
                              className="text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <IconPlus className="w-3 h-3 text-[#f04824]" />{" "}
                              Add accepted alternate spellings (Optional)
                            </button>
                          ) : (
                            <div className="animate-fadeIn">
                              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                                Accepted Alternates (Comma separated)
                              </label>
                              <input
                                type="text"
                                value={creatorAlternates}
                                onChange={(e) =>
                                  setCreatorAlternates(e.target.value)
                                }
                                placeholder="e.g. truncate, TRUNCATE TABLE"
                                className="w-full h-9 px-3 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-all"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Optional Study Hint Pill */}
                      <div className="mb-6 pt-3 border-t border-slate-100">
                        {!creatorShowHint && !creatorHint ? (
                          <button
                            type="button"
                            onClick={() => setCreatorShowHint(true)}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <IconPlus className="w-3 h-3 text-amber-500" /> Add
                            study hint or topic tag (Optional)
                          </button>
                        ) : (
                          <div className="animate-fadeIn">
                            <label className="text-[11px] font-bold text-slate-500 block mb-1">
                              Study Hint / Tag
                            </label>
                            <input
                              type="text"
                              value={creatorHint}
                              onChange={(e) => setCreatorHint(e.target.value)}
                              placeholder="e.g. DDL Command, Fast Erase, Chapter 2"
                              className="w-full h-9 px-3 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white transition-all"
                            />
                          </div>
                        )}
                      </div>

                      {/* Bottom Actions Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setCreatorStep(1)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            ← Back to Question
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCreatorPrompt("");
                              setCreatorHint("");
                              setCreatorOptions(["", "", "", ""]);
                              setCreatorAnswer("");
                              setCreatorAlternates("");
                              setCreatorCorrectIndex(0);
                              setCreatorStep(1);
                            }}
                            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="hidden sm:inline-block text-[11px] font-medium text-slate-400">
                            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600">
                              Ctrl
                            </kbd>{" "}
                            +{" "}
                            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600">
                              Enter
                            </kbd>
                          </span>
                          <button
                            type="button"
                            onClick={handleSaveBombcard}
                            className="h-11 px-6 rounded-xl bg-[#f04824] hover:bg-[#e03e1b] text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                          >
                            {creatorEditingCardId ? (
                              <IconEdit className="w-4 h-4" />
                            ) : (
                              <IconPlus className="w-4 h-4" />
                            )}
                            {creatorEditingCardId
                              ? "Save Changes"
                              : "Add Bombcard"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Deck Collection & Quick Study */}
            <div className="lg:col-span-4 space-y-5">
              {/* Visual Deck Stack Card */}
              <div
                className={`csm-studio-card-stack ${creatorCardAddedAnimation ? "csm-studio-pulse-anim" : ""}`}
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <IconCards className="w-4 h-4 text-slate-700 flex-shrink-0" />
                    <h3 className="text-xs font-extrabold text-slate-900 truncate">
                      Deck Collection
                    </h3>
                  </div>
                  <span
                    className="text-[11px] font-bold text-slate-400 truncate max-w-[130px] text-right"
                    title={currentTargetDeck?.code || currentTargetDeck?.title}
                  >
                    {currentTargetDeck?.code || currentTargetDeck?.title}
                  </span>
                </div>

                {/* Card Pile Visual Representation */}
                <div className="text-center py-4 bg-white/70 rounded-2xl border border-slate-200/80 mb-4 shadow-xs">
                  <span className="text-3xl font-black text-slate-900 tracking-tight block">
                    {deckCards.length}
                  </span>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5 block">
                    Total Bombcards
                  </span>
                  <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {mcqCards.length} MCQ
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      {idCards.length} ID
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (currentTargetDeck)
                      setSelectedDeckIds([currentTargetDeck.id]);
                    setActiveTab("flashcards");
                  }}
                  className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm px-3"
                >
                  <span className="truncate">
                    Study {currentTargetDeck?.code || "Deck"} Now
                  </span>
                  <IconArrowRight className="w-4 h-4 flex-shrink-0" />
                </button>
              </div>

              {/* Cards in Deck List */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <h4 className="text-xs font-extrabold text-slate-900">
                    Cards in this Deck
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400">
                    {deckCards.length} total
                  </span>
                </div>

                {deckCards.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-[#f04824] flex items-center justify-center mx-auto mb-2">
                      <IconCards className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      No cards yet
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Write your question on the left to forge your first card!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll pr-1">
                    {deckCards.map((card, idx) => (
                      <div
                        key={card.id || idx}
                        className="p-2.5 bg-[#f8fafc] hover:bg-slate-50 border border-slate-200/70 rounded-xl text-xs flex items-start justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600">
                              #{idx + 1}
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-400">
                              {card.type === "MULTIPLE_CHOICE"
                                ? "MCQ"
                                : card.type === "TRUE_FALSE"
                                  ? "T/F"
                                  : "ID"}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800 truncate mt-1">
                            {card.prompt}
                          </p>
                        </div>
                        <span className="text-[10px] font-black text-[#f04824] bg-white border border-slate-200 px-2 py-0.5 rounded max-w-[100px] truncate flex-shrink-0">
                          {card.correctAnswer || "Answer"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  })();
}
