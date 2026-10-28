import {
  IconCards,
  IconSparkles,
  IconUpload,
} from "../../components/icons.jsx";
import React from "react";
export function AddMaterialDialog({
  addMaterialFileInputRef,
  decks,
  handleAddMaterialDirectUpload,
  handleChooseManualCreation,
  handleOpenAiGenerator,
  isDraggingAddMaterialFile,
  setIsAddMaterialPopupOpen,
  setIsDraggingAddMaterialFile,
  targetDeckForAddMaterial,
}) {
  return (
    <div
      className="csm-modal-backdrop csm-add-material-backdrop"
      role="presentation"
      onClick={() => setIsAddMaterialPopupOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-material-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-[26px] p-6 sm:p-7 shadow-2xl border border-slate-200 flex flex-col relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-extrabold text-[#f04824] uppercase tracking-wider block">
              ADD MATERIAL
            </span>
            <h3
              id="add-material-title"
              className="text-xl font-black text-slate-900 tracking-tight"
            >
              {targetDeckForAddMaterial
                ? targetDeckForAddMaterial.code ||
                  targetDeckForAddMaterial.title
                : "Reviewer Materials"}
            </h3>
          </div>
          <button
            onClick={() => setIsAddMaterialPopupOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer text-xl"
            title="Close"
          >
            &times;
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={addMaterialFileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={(e) => handleAddMaterialDirectUpload(e.target.files)}
          className="hidden"
        />

        {/* 1. Primary Upload / Drag File Area */}
        <div className="mt-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingAddMaterialFile(true);
            }}
            onDragLeave={() => setIsDraggingAddMaterialFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingAddMaterialFile(false);
              handleAddMaterialDirectUpload(e.dataTransfer.files);
            }}
            onClick={() => addMaterialFileInputRef.current?.click()}
            className={`p-6 sm:p-7 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center ${isDraggingAddMaterialFile ? "border-[#f04824] bg-orange-50/60 shadow-inner" : "border-slate-300/80 bg-[#f8f9fa] hover:bg-[#fff9f8] hover:border-[#f04824]/50"}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#f04824] mb-3">
              <IconUpload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-black text-slate-900">
              Drag or upload file here
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Supported format — PDF documents & lecture slides
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addMaterialFileInputRef.current?.click();
              }}
              className="mt-4 h-9 px-5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold rounded-full inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <IconUpload className="w-3.5 h-3.5 text-[#f04824]" />
              <span>Upload File</span>
            </button>
          </div>
        </div>

        {/* Divider with 'OR' */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 border-t border-slate-200/90" />
          <span className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">
            OR
          </span>
          <div className="flex-1 border-t border-slate-200/90" />
        </div>

        {/* 2 & 3. Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option 2: Create Bombcards Manually */}
          <div
            onClick={handleChooseManualCreation}
            className="bg-[#f8f9fa] hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3 group-hover:bg-[#f04824] transition-colors shadow-sm">
              <IconCards className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-[#f04824] transition-colors">
                Create Bombcards Manually
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Create your own Bombcards
              </p>
            </div>
          </div>

          {/* Option 3: Generate AI Bombcards */}
          <div
            onClick={() => {
              const targetDeck = targetDeckForAddMaterial || decks[0];
              setIsAddMaterialPopupOpen(false);
              handleOpenAiGenerator(targetDeck?.id);
            }}
            className="bg-[#f8f9fa] hover:bg-purple-50/40 border border-slate-200/90 hover:border-purple-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group text-left"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                <IconSparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                    Generate with AI
                  </h4>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700">
                    Gemini
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Generate Bombcards from notes with AI
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
