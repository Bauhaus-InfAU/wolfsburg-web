import { cn } from '@/lib/utils';
import { useSimulation } from '@/context/FlowContext';

export function SegmentEditor() {
  const {
    // remove
    isRemoveMode,
    toggleRemoveMode,
    disabledStreets,
    restoreStreet,
    restoreAllStreets,
    // add
    isAddMode,
    toggleAddMode,
    addedStreets,
    removeAddedSegment,
    clearAllAddedSegments,
    // save
    saveStreetEdits,
    streetEditsUnsaved,
  } = useSimulation();

  return (
    <div className="space-y-3">
      {/* Mode buttons */}
      <div className="flex gap-2">
        <button
          onClick={toggleRemoveMode}
          className={cn(
            'flex-1 text-xs py-2 px-2 rounded-lg border transition-colors',
            isRemoveMode
              ? 'bg-destructive/15 text-destructive border-destructive/40 font-medium'
              : 'bg-transparent text-foreground border-border hover:bg-accent/50'
          )}
        >
          {isRemoveMode ? '✕ Removing…' : 'Remove street'}
        </button>

        <button
          onClick={toggleAddMode}
          className={cn(
            'flex-1 text-xs py-2 px-2 rounded-lg border transition-colors',
            isAddMode
              ? 'bg-green-500/15 text-green-600 border-green-500/40 font-medium'
              : 'bg-transparent text-foreground border-border hover:bg-accent/50'
          )}
        >
          {isAddMode ? '+ Adding…' : 'Add street'}
        </button>
      </div>

      {/* Active mode hint */}
      {isRemoveMode && (
        <p className="text-[10px] text-destructive/80 leading-relaxed">
          Click any street on the map to remove it from the flow model.
        </p>
      )}
      {isAddMode && (
        <p className="text-[10px] text-green-600 leading-relaxed">
          Click a start point on the map, then click an end point to add a new segment.
        </p>
      )}

      {/* Removed streets list */}
      {disabledStreets.size > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Removed ({disabledStreets.size})
            </span>
            <button onClick={restoreAllStreets} className="text-[10px] text-primary hover:underline">
              Restore all
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {Array.from(disabledStreets.values()).map(info => (
              <div
                key={info.fid}
                className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded px-2 py-1"
              >
                <span className="w-3 h-0.5 bg-destructive flex-shrink-0 rounded" />
                <span className="text-[10px] text-foreground truncate flex-1 min-w-0">
                  {info.name || `Street ${info.fid}`}
                </span>
                <button
                  onClick={() => restoreStreet(info.fid)}
                  className="text-[10px] text-primary hover:underline flex-shrink-0"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Added streets list */}
      {addedStreets.size > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Added ({addedStreets.size})
            </span>
            <button onClick={clearAllAddedSegments} className="text-[10px] text-primary hover:underline">
              Remove all
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {Array.from(addedStreets.values()).map(info => (
              <div
                key={info.key}
                className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded px-2 py-1"
              >
                <span className="w-3 h-0.5 bg-green-500 flex-shrink-0 rounded" />
                <span className="text-[10px] text-foreground truncate flex-1 min-w-0 font-mono">
                  Custom segment
                </span>
                <button
                  onClick={() => removeAddedSegment(info.key)}
                  className="text-[10px] text-primary hover:underline flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isRemoveMode && !isAddMode && disabledStreets.size === 0 && addedStreets.size === 0 && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Remove existing streets or draw new ones to see how flows change.
        </p>
      )}

      {/* Save button — shown when there is anything to save */}
      {(disabledStreets.size > 0 || addedStreets.size > 0) && (
        <div className="pt-1 border-t border-border flex items-center gap-2">
          <button
            onClick={saveStreetEdits}
            className={cn(
              'flex-1 text-xs py-2 px-3 rounded-lg border transition-colors font-medium',
              streetEditsUnsaved
                ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                : 'bg-transparent text-muted-foreground border-border cursor-default'
            )}
            disabled={!streetEditsUnsaved}
          >
            {streetEditsUnsaved ? 'Save changes' : 'Changes saved'}
          </button>
          {!streetEditsUnsaved && (
            <span className="text-[10px] text-muted-foreground">✓</span>
          )}
        </div>
      )}
    </div>
  );
}
