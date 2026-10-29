import { IconEdit, IconReset, IconShare, IconTrash } from "../../components/icons.jsx";
import React from "react";
export function DeckCardActions({
  deck,
  handleDeleteFolder,
  handleOpenEditFolderInfo,
  handleResetDeckProgress,
  handleShareDeck,
  isGuest,
  openDeckMenuId,
  setOpenDeckMenuId,
}) {
  if (isGuest) {
    return (
      <div className="csm-deck-actions">
        <button
          type="button"
          className="csm-share-button !p-1.5 !text-xs"
          onClick={(e) => handleShareDeck(deck, e)}
          title="Share this reviewer via link"
        >
          <IconShare />
        </button>
      </div>
    );
  }
  const isOpen = openDeckMenuId === deck.id;
  return (
    <div className="csm-deck-actions">
      <button
        type="button"
        className="csm-deck-menu-trigger"
        aria-label={`Actions for ${deck.code || deck.title}`}
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setOpenDeckMenuId(isOpen ? null : deck.id);
        }}
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
      {isOpen && (
        <div className="csm-deck-menu" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => handleOpenEditFolderInfo(deck, e)}
          >
            <IconEdit /> Edit
          </button>
          <button
            type="button"
            className="danger"
            onClick={(e) => handleResetDeckProgress(deck, e)}
          >
            <IconReset /> Reset progress
          </button>
          <button
            type="button"
            className="danger"
            onClick={(e) => handleDeleteFolder(deck.id, e)}
          >
            <IconTrash /> Move to archive
          </button>
        </div>
      )}
    </div>
  );
}
