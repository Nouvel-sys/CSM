import {
  IconArrowLeft,
  IconArrowRight,
  IconCards,
  IconEdit,
  IconLibrary,
  IconLock,
  IconNotebook,
  IconPdf,
  IconPlus,
  IconSearch,
  IconShare,
  IconSparkles,
  IconTrash,
} from "../../components/icons.jsx";
import { getCompactPageItems } from "../../utils/pagination.js";
import { DeckCardActions } from "./DeckCardActions.jsx";
import React from "react";
export function LibraryScreen({
  bulkDeleteMode,
  collapseOlder,
  collapseRecent,
  currentSelectedDeck,
  deckVisibilitySaving,
  handleBulkRemoveBombcards,
  handleDeckVisibility,
  handleDeleteFolder,
  handleOpenAddMaterialPopup,
  handleOpenAiGenerator,
  handleOpenCreateFolderInfo,
  handleOpenDeckStudy,
  handleOpenDocument,
  handleOpenEditFolderInfo,
  handleRemoveBombcard,
  handleRemoveDocument,
  handleShareDeck,
  isGuest,
  libraryPage,
  libraryPageCount,
  libraryReturnFromPdf,
  librarySubjectFilter,
  librarySubjectOptions,
  olderDecks,
  openDeckMenuId,
  openMaterialMenuId,
  orderedLibraryDecks,
  pageOlderDecks,
  pageRecentDecks,
  prepareNewBombcard,
  profile,
  recentDecks,
  renderLibraryDeckCard,
  revealedLibraryCards,
  searchQuery,
  selectedBombcardIds,
  selectedDeckForFolderView,
  setActiveTab,
  setBulkDeleteMode,
  setCollapseOlder,
  setCollapseRecent,
  setCreatorTargetDeckId,
  setGuestLockedSection,
  setLibraryPage,
  setLibrarySubjectFilter,
  setOpenDeckMenuId,
  setOpenMaterialMenuId,
  setSearchQuery,
  setSelectedBombcardIds,
  setSelectedDeckForFolderView,
  setSelectedDeckIds,
  setShowAllBombcards,
  showAllBombcards,
  startEditingBombcard,
  toggleLibraryCardAnswer,
  totalBombCards,
  totalDocuments,
  totalReviewers,
  visibleCards,
}) {
  return (
    <div className="csm-library-screen custom-scroll">
      {!(selectedDeckForFolderView && currentSelectedDeck) && (
        <>
      <div className="csm-library-header">
        <div>
          <span className="csm-kicker">YOUR STUDY DESK</span>
          <h1>Reviewer Library</h1>
          <p>
            Build focused reviewers, keep your notes together, and pick up where
            you left off.
          </p>
        </div>
        <div className="csm-library-header-actions">
          <button
            type="button"
            className="csm-primary-button"
            onClick={() => {
              if (isGuest) {
                setGuestLockedSection("creator");
                return;
              }
              handleOpenCreateFolderInfo();
            }}
          >
            {isGuest ? (
              <>
                <IconLock className="w-3.5 h-3.5 mr-1" /> New deck
              </>
            ) : (
              <>
                <IconPlus /> New deck
              </>
            )}
          </button>
        </div>
      </div>

      <div className="csm-library-overview">
        <div className="csm-library-overview-card">
          <span>
            <IconLibrary />
          </span>
          <div>
            <small>Total decks</small>
            <strong>{totalReviewers}</strong>
          </div>
        </div>
        <div className="csm-library-overview-card">
          <span>
            <IconCards />
          </span>
          <div>
            <small>Bombcards</small>
            <strong>{totalBombCards}</strong>
          </div>
        </div>
        <div className="csm-library-overview-card">
          <span>
            <IconPdf />
          </span>
          <div>
            <small>PDF notes</small>
            <strong>{totalDocuments}</strong>
          </div>
        </div>
      </div>
        </>
      )}

      {selectedDeckForFolderView && currentSelectedDeck ? (
        <div
          className={`csm-library-detail animate-fadeIn${libraryReturnFromPdf ? " csm-library-return-from-pdf" : ""}`}
        >
          <div className="csm-library-detail-header">
            <div className="csm-library-detail-heading">
              <button
                type="button"
                className="csm-library-back"
                onClick={() => setSelectedDeckForFolderView(null)}
                title="Back to Reviewer Library"
                aria-label="Back to Reviewer Library"
              >
                <IconArrowLeft />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="csm-kicker">
                    {isGuest ? "SHARED REVIEWER" : "REVIEWER DECK"}
                  </span>
                  {isGuest && (
                    <span className="csm-library-shared-badge">Shared</span>
                  )}
                </div>
                <h1>{currentSelectedDeck.code || currentSelectedDeck.title}</h1>
                <p>
                  {currentSelectedDeck.subject || "Information Technology"} ·{" "}
                  {isGuest
                    ? `By ${currentSelectedDeck.owner || "Shared Reviewer"}`
                    : `Updated ${currentSelectedDeck.lastModified || "recently"}`}
                </p>
              </div>
            </div>
            <div className="csm-library-detail-actions">
              {!isGuest && (
                <label className="csm-deck-visibility-control">
                  <span>Deck visibility</span>
                  <select
                    aria-label="Deck visibility"
                    value={currentSelectedDeck.visibility || "inherit"}
                    disabled={deckVisibilitySaving}
                    onChange={(event) =>
                      handleDeckVisibility(
                        currentSelectedDeck,
                        event.target.value,
                      )
                    }
                  >
                    <option value="inherit">
                      Use profile default ({profile.deckVisibility || "private"}
                      )
                    </option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </label>
              )}
              <button
                type="button"
                className="csm-share-button"
                onClick={(e) => handleShareDeck(currentSelectedDeck, e)}
                title="Share this reviewer via link"
              >
                <IconShare /> Share
              </button>
              {!isGuest && (
                <DeckCardActions
                  deck={currentSelectedDeck}
                  handleDeleteFolder={handleDeleteFolder}
                  handleOpenEditFolderInfo={handleOpenEditFolderInfo}
                  handleShareDeck={handleShareDeck}
                  isGuest={isGuest}
                  openDeckMenuId={openDeckMenuId}
                  setOpenDeckMenuId={setOpenDeckMenuId}
                />
              )}
              <button
                type="button"
                className="csm-secondary-button"
                onClick={() => handleOpenDeckStudy(currentSelectedDeck)}
              >
                <IconNotebook /> Study deck
              </button>
              <button
                type="button"
                className="csm-primary-button"
                onClick={() => {
                  if (isGuest) {
                    setGuestLockedSection("arena");
                    return;
                  }
                  handleOpenDeckStudy(currentSelectedDeck, "game");
                }}
              >
                {isGuest && (
                  <IconLock className="w-3.5 h-3.5 mr-1.5 text-white/90" />
                )}
                Play Bomb Mode
                <span className="csm-library-play-arrow">
                  <IconArrowRight />
                </span>
              </button>
            </div>
          </div>

          <div className="csm-library-detail-stats">
            <div className="csm-library-detail-stat">
              <span className="csm-library-detail-stat-icon">
                <IconCards />
              </span>
              <div>
                <small>Bombcards</small>
                <strong>{currentSelectedDeck.cards?.length || 0}</strong>
              </div>
            </div>
            <div className="csm-library-detail-stat">
              <span className="csm-library-detail-stat-icon">
                <IconPdf />
              </span>
              <div>
                <small>PDF notes</small>
                <strong>{currentSelectedDeck.documents?.length || 0}</strong>
              </div>
            </div>
            <div
              className={`csm-library-detail-stat${currentSelectedDeck.cards?.length ? " accent" : ""}`}
            >
              <span className="csm-library-detail-stat-icon">
                <IconSparkles />
              </span>
              <div>
                <small>Study status</small>
                <strong>
                  {currentSelectedDeck.cards?.length ? "Ready" : "Needs cards"}
                </strong>
              </div>
            </div>
          </div>

          <section className="csm-library-content-section">
            <div className="csm-library-section-heading">
              <div className="csm-library-section-heading-left">
                <span className="csm-kicker">PRACTICE SET</span>
                <span className="csm-library-count-pill">
                  {currentSelectedDeck.cards?.length || 0} cards
                </span>
              </div>
              <div className="csm-library-section-actions">
                {currentSelectedDeck.cards?.length > 3 && (
                  <button
                    type="button"
                    className="csm-library-show-all"
                    aria-expanded={showAllBombcards}
                    aria-controls="practice-set-cards"
                    onClick={() => setShowAllBombcards((prev) => !prev)}
                  >
                    {showAllBombcards ? "Show less" : "Show all"}
                  </button>
                )}
                {isGuest && (
                  <button
                    type="button"
                    onClick={() => setGuestLockedSection("creator")}
                  >
                    <IconLock className="w-3.5 h-3.5 mr-1 text-slate-500" />{" "}
                    Create Bombcards
                  </button>
                )}
              </div>
            </div>
            {!!currentSelectedDeck.cards?.length && !isGuest && (
              <div
                className={`csm-bombcard-bulk-toolbar ${bulkDeleteMode ? "is-selecting" : ""}`}
              >
                <div className="csm-bombcard-bulk-controls">
                  {!bulkDeleteMode ? (
                    <button
                      type="button"
                      className="csm-bombcard-bulk-start"
                      onClick={() => {
                        setBulkDeleteMode(true);
                        setSelectedBombcardIds([]);
                        setShowAllBombcards(true);
                      }}
                    >
                      <IconTrash /> Select Cards
                    </button>
                  ) : (
                    <>
                      <div className="csm-bombcard-bulk-selection">
                        <button
                          type="button"
                          className="csm-bombcard-bulk-select-all"
                          onClick={() => {
                            const allIds = (currentSelectedDeck.cards || [])
                              .map((card) => card.id)
                              .filter(Boolean);
                            const allSelected =
                              allIds.length > 0 &&
                              allIds.every((id) =>
                                selectedBombcardIds.includes(id),
                              );
                            setSelectedBombcardIds(allSelected ? [] : allIds);
                          }}
                        >
                          {currentSelectedDeck.cards.every(
                            (card) =>
                              card.id && selectedBombcardIds.includes(card.id),
                          )
                            ? "Deselect all"
                            : `Select all ${currentSelectedDeck.cards.length}`}
                        </button>
                        <span aria-live="polite">
                          {selectedBombcardIds.length} selected
                        </span>
                      </div>
                      <div className="csm-bombcard-bulk-actions">
                        <button
                          type="button"
                          className="csm-bombcard-bulk-cancel"
                          onClick={() => {
                            setBulkDeleteMode(false);
                            setSelectedBombcardIds([]);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="csm-bombcard-bulk-delete"
                          disabled={!selectedBombcardIds.length}
                          onClick={() =>
                            handleBulkRemoveBombcards(currentSelectedDeck)
                          }
                        >
                          <IconTrash /> Delete selected (
                          {selectedBombcardIds.length})
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="csm-bombcard-create-button"
                  onClick={() => {
                    setBulkDeleteMode(false);
                    setSelectedBombcardIds([]);
                    prepareNewBombcard();
                    setSelectedDeckIds([currentSelectedDeck.id]);
                    setCreatorTargetDeckId(currentSelectedDeck.id);
                    setActiveTab("creator");
                  }}
                >
                  <IconPlus /> Create Bombcards
                </button>
              </div>
            )}
            {!currentSelectedDeck.cards ||
            currentSelectedDeck.cards.length === 0 ? (
              <div className="csm-library-empty">
                <strong>Your Bombcard set is empty</strong>
                <p>
                  Add your first question manually or explore reviewer tools to
                  start building this set.
                </p>
                <button
                  type="button"
                  className="csm-primary-button"
                  onClick={() => {
                    if (isGuest) {
                      setGuestLockedSection("creator");
                      return;
                    }
                    prepareNewBombcard();
                    setSelectedDeckIds([currentSelectedDeck.id]);
                    setCreatorTargetDeckId(currentSelectedDeck.id);
                    setActiveTab("creator");
                  }}
                >
                  {isGuest ? (
                    <>
                      <IconLock className="w-3.5 h-3.5 mr-1" /> Create Bombcards
                    </>
                  ) : (
                    <>
                      <IconPlus /> Create Bombcards
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div
                className="csm-library-bombcard-grid"
                id="practice-set-cards"
              >
                {visibleCards.map((card, idx) => {
                  const cardId =
                    card.id || `${currentSelectedDeck.id}-card-${idx}`;
                  const isRevealed = revealedLibraryCards.includes(cardId);
                  const materialMenuOpen = openMaterialMenuId === cardId;
                  const isSelectedForDeletion =
                    selectedBombcardIds.includes(cardId);
                  return (
                    <article
                      key={cardId}
                      className={`csm-library-bombcard ${isRevealed ? "revealed" : ""} ${isSelectedForDeletion ? "is-selected-for-delete" : ""}`}
                    >
                      <div className="csm-library-bombcard-top">
                        {bulkDeleteMode ? (
                          <label className="csm-bombcard-select-control">
                            <input
                              type="checkbox"
                              checked={isSelectedForDeletion}
                              disabled={!card.id}
                              aria-label={`Select Bombcard ${idx + 1} for deletion`}
                              onChange={(event) =>
                                setSelectedBombcardIds((current) =>
                                  event.target.checked
                                    ? [...current, cardId]
                                    : current.filter((id) => id !== cardId),
                                )
                              }
                            />
                            <span>
                              {currentSelectedDeck.code ||
                                currentSelectedDeck.title}{" "}
                              · M{idx + 1}
                            </span>
                          </label>
                        ) : (
                          <span>
                            {currentSelectedDeck.code ||
                              currentSelectedDeck.title}{" "}
                            · M{idx + 1}
                          </span>
                        )}
                        {!isGuest && !bulkDeleteMode && (
                          <div className="csm-material-actions">
                            <button
                              type="button"
                              className="csm-material-menu-trigger"
                              aria-label={`Card options for ${idx + 1}`}
                              aria-expanded={materialMenuOpen}
                              onClick={() =>
                                setOpenMaterialMenuId(
                                  materialMenuOpen ? null : cardId,
                                )
                              }
                            >
                              •••
                            </button>
                            {materialMenuOpen && (
                              <div className="csm-material-menu">
                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleLibraryCardAnswer(cardId);
                                    setOpenMaterialMenuId(null);
                                  }}
                                >
                                  {isRevealed ? "Hide answer" : "Reveal answer"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    startEditingBombcard(
                                      currentSelectedDeck,
                                      card,
                                    )
                                  }
                                >
                                  <IconEdit /> Edit Bombcard
                                </button>
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() =>
                                    handleRemoveBombcard(
                                      currentSelectedDeck,
                                      cardId,
                                    )
                                  }
                                >
                                  <IconTrash /> Delete Bombcard
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="csm-library-bombcard-prompt">
                        {card.prompt}
                      </p>
                      {isRevealed && (
                        <p className="csm-library-bombcard-answer">
                          {card.correctAnswer || "Answer not saved yet."}
                        </p>
                      )}
                      <div className="csm-library-bombcard-footer">
                        <small>
                          {card.type === "MULTIPLE_CHOICE"
                            ? "Multiple choice"
                            : card.type === "TRUE_FALSE"
                              ? "True / False"
                              : "Identification"}
                        </small>
                        <button
                          type="button"
                          className="csm-library-reveal"
                          onClick={() => toggleLibraryCardAnswer(cardId)}
                        >
                          {isRevealed ? "Hide answer" : "Reveal answer"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="csm-library-content-section csm-library-reference-notes">
            <div className="csm-library-section-heading">
              <div className="csm-library-section-heading-left">
                <span className="csm-kicker">REFERENCE NOTES</span>
                <span className="csm-library-count-pill">
                  {currentSelectedDeck.documents?.length || 0} PDFs
                </span>
              </div>
              <button
                className="csm-library-add-pdf-button"
                type="button"
                onClick={(e) => {
                  if (isGuest) {
                    setGuestLockedSection("creator");
                    return;
                  }
                  handleOpenAddMaterialPopup(currentSelectedDeck, e);
                }}
              >
                {isGuest ? (
                  <>
                    <IconLock className="w-3.5 h-3.5" /> Add PDF
                  </>
                ) : (
                  <>
                    <IconPlus /> Add PDF
                  </>
                )}
              </button>
            </div>
            <div className="csm-library-documents">
              {!currentSelectedDeck.documents ||
              currentSelectedDeck.documents.length === 0 ? (
                <div className="csm-library-empty-row">
                  No documents attached yet. Upload lecture notes or slides to
                  keep them beside this reviewer.
                </div>
              ) : (
                currentSelectedDeck.documents.map((doc) => {
                  const docMenuId = `doc-${doc.id}`;
                  const documentMenuOpen = openMaterialMenuId === docMenuId;
                  return (
                    <div key={doc.id} className="csm-library-document">
                      <div className="csm-library-document-main">
                        <span className="csm-library-document-icon">PDF</span>
                        <div className="csm-library-document-copy">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenDocument(currentSelectedDeck, doc)
                            }
                          >
                            {doc.title}
                          </button>
                          <small>
                            PDF reference · Click to open in PDF Tools
                          </small>
                        </div>
                      </div>
                      <div className="csm-material-actions flex items-center gap-1.5">
                        {!isGuest && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenAiGenerator(currentSelectedDeck.id, doc)
                            }
                            className="h-7 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            title="Generate Bombcards from this PDF with Gemini AI"
                          >
                            <IconSparkles className="w-3 h-3 text-purple-600" />
                            <span>AI Cards</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="csm-material-menu-trigger"
                          aria-label={`Document options for ${doc.title}`}
                          aria-expanded={documentMenuOpen}
                          onClick={() =>
                            setOpenMaterialMenuId(
                              documentMenuOpen ? null : docMenuId,
                            )
                          }
                        >
                          <svg
                            className="csm-admin-user-more-icon"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <circle cx="5" cy="12" r="1.7" />
                            <circle cx="12" cy="12" r="1.7" />
                            <circle cx="19" cy="12" r="1.7" />
                          </svg>
                        </button>
                        {documentMenuOpen && (
                          <div className="csm-material-menu">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMaterialMenuId(null);
                                handleOpenDocument(currentSelectedDeck, doc);
                              }}
                            >
                              Open PDF tools
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMaterialMenuId(null);
                                window.location.assign(`${doc.url}&download=1`);
                              }}
                            >
                              Download PDF
                            </button>
                            {!isGuest && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMaterialMenuId(null);
                                  handleOpenAiGenerator(
                                    currentSelectedDeck.id,
                                    doc,
                                  );
                                }}
                                className="flex items-center gap-1.5"
                              >
                                <IconSparkles className="w-3.5 h-3.5 text-purple-600" />{" "}
                                Generate AI Flashcards
                              </button>
                            )}
                            {!isGuest && (
                              <button
                                type="button"
                                className="danger"
                                onClick={() =>
                                  handleRemoveDocument(
                                    currentSelectedDeck.id,
                                    doc.id,
                                  )
                                }
                              >
                                <IconTrash /> Remove PDF
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="csm-library-main animate-fadeIn">
          <div className="csm-library-toolbar">
            <label className="csm-library-search">
              <IconSearch />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setLibraryPage(1);
                }}
                placeholder="Search decks by title or subject"
                aria-label="Search decks by title or subject"
              />
            </label>
            <label className="csm-library-filter">
              <span>Filter</span>
              <select
                value={librarySubjectFilter}
                onChange={(e) => {
                  setLibrarySubjectFilter(e.target.value);
                  setLibraryPage(1);
                }}
                aria-label="Filter decks by subject"
              >
                {librarySubjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {(pageRecentDecks.length > 0 ||
            (libraryPage === 1 && recentDecks.length === 0)) && (
            <section className="csm-library-list-section">
              <div className="csm-library-section-heading">
                <div>
                  <h2>Recently updated</h2>
                  <span>
                    {recentDecks.length} deck
                    {recentDecks.length === 1 ? "" : "s"} · last 7 days
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCollapseRecent((prev) => !prev)}
                >
                  {collapseRecent ? "Show section" : "Collapse section"}
                </button>
              </div>
              <div
                className={`csm-library-collapse-panel${collapseRecent ? " is-collapsed" : ""}`}
                aria-hidden={collapseRecent}
              >
                <div className="csm-library-collapse-panel-inner">
                  {pageRecentDecks.length ? (
                    <div className="csm-library-deck-grid">
                      {pageRecentDecks.map(renderLibraryDeckCard)}
                    </div>
                  ) : (
                    <div className="csm-library-empty">
                      <strong>
                        {olderDecks.length
                          ? "No recently updated decks"
                          : "No decks match your search"}
                      </strong>
                      <p>
                        {olderDecks.length
                          ? "Your matching reviewers are listed below."
                          : "Try another title or subject, or create a fresh reviewer."}
                      </p>
                      <button
                        type="button"
                        className="csm-primary-button"
                        onClick={handleOpenCreateFolderInfo}
                      >
                        <IconPlus /> Add a deck
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {pageOlderDecks.length > 0 && (
            <section className="csm-library-list-section mt-6">
              <div className="csm-library-section-heading">
                <div>
                  <h2>More reviewers</h2>
                  <span>
                    {olderDecks.length} deck{olderDecks.length === 1 ? "" : "s"}{" "}
                    · older than a week
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCollapseOlder((prev) => !prev)}
                >
                  {collapseOlder ? "Show section" : "Collapse section"}
                </button>
              </div>
              <div
                className={`csm-library-collapse-panel${collapseOlder ? " is-collapsed" : ""}`}
                aria-hidden={collapseOlder}
              >
                <div className="csm-library-collapse-panel-inner">
                  <div className="csm-library-deck-grid">
                    {pageOlderDecks.map(renderLibraryDeckCard)}
                  </div>
                </div>
              </div>
            </section>
          )}

          {orderedLibraryDecks.length > 0 && (
            <nav className="csm-library-pagination" aria-label="Deck pages">
              <span className="csm-library-page-summary">
                Showing {(libraryPage - 1) * 9 + 1} to{" "}
                {Math.min(libraryPage * 9, orderedLibraryDecks.length)} of{" "}
                {orderedLibraryDecks.length} decks
              </span>
              {libraryPageCount > 1 && (
                <div className="csm-library-pagination-controls">
                  <button
                    type="button"
                    className="csm-secondary-button"
                    onClick={() =>
                      setLibraryPage((page) => Math.max(1, page - 1))
                    }
                    disabled={libraryPage === 1}
                  >
                    Previous
                  </button>
                  <div
                    className="csm-library-page-numbers"
                    aria-label="Select a page"
                  >
                    {getCompactPageItems(libraryPage, libraryPageCount).map(
                      (item) =>
                        item.type === "ellipsis" ? (
                          <span
                            key={item.key}
                            className="csm-library-page-ellipsis"
                            aria-hidden="true"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={item.value}
                            type="button"
                            className={`csm-library-page-number ${libraryPage === item.value ? "is-current" : ""}`}
                            aria-label={`Page ${item.value}`}
                            aria-current={
                              libraryPage === item.value ? "page" : undefined
                            }
                            onClick={() => setLibraryPage(item.value)}
                          >
                            {item.value}
                          </button>
                        ),
                    )}
                  </div>
                  <button
                    type="button"
                    className="csm-secondary-button"
                    onClick={() =>
                      setLibraryPage((page) =>
                        Math.min(libraryPageCount, page + 1),
                      )
                    }
                    disabled={libraryPage === libraryPageCount}
                  >
                    Next
                  </button>
                </div>
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
