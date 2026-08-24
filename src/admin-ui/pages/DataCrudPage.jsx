import React, { useEffect, useMemo, useState } from "react";
import { FaBuilding, FaTable, FaPen, FaFileCode, FaSearch, FaPlus, FaDownload, FaRedo, FaLock } from "react-icons/fa";
import AIFormJsonAssistant from "../components/AIFormJsonAssistant";

const PAGE_SIZE = 20;
const MART_ORDER_STATUSES = ["pending", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled", "refunded"];

function normalizeStatusClass(value) {
  return String(value || "pending").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "pending";
}

function titleValue(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseJsonValue(value) {
  if (!value) return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !/^[\[{]/.test(trimmed)) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function JsonObjectCell({ value }) {
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== "object") return null;
  if (Array.isArray(parsed)) {
    const items = parsed.slice(0, 3);
    return (
      <div className="json-cell-list">
        {items.map((item, idx) => {
          const name = item && typeof item === "object" ? (item.name || item.title || item.itemName || `Item ${idx + 1}`) : item;
          const qty = item && typeof item === "object" ? (item.quantity || item.qty || item.count) : "";
          const price = item && typeof item === "object" ? (item.price || item.amount || item.total) : "";
          return (
            <div className="json-cell-card" key={`${idx}-${String(name)}`}>
              <strong>{String(name || `Item ${idx + 1}`).slice(0, 56)}</strong>
              <span>{qty ? `Qty ${qty}` : "Qty —"}{price !== "" && price !== undefined ? ` · ₹${price}` : ""}</span>
            </div>
          );
        })}
        {parsed.length > items.length ? <span className="json-cell-more">+{parsed.length - items.length} more</span> : null}
      </div>
    );
  }
  return (
    <div className="json-cell-list">
      {Object.entries(parsed).slice(0, 4).map(([key, itemValue]) => (
        <div className="json-cell-kv" key={key}>
          <span>{titleValue(key)}</span>
          <strong>{typeof itemValue === "object" ? JSON.stringify(itemValue).slice(0, 44) : String(itemValue ?? "—").slice(0, 44)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function DataCrudPage({
  page,
  currentTables,
  selectedTable,
  setSelectedTable,
  tab,
  setTab,
  effectiveTable,
  search,
  setSearch,
  filteredRows,
  setSelectedRowKey,
  activeTable,
  tablePage,
  setTablePage,
  selectedRow,
  saveForm,
  openImages,
  upsertPartial,
  catalogLookup,
  jsonDraft,
  setJsonDraft,
  saveJson,
  tableLabel,
  tableDb,
  columnLabel,
  keyCol,
  firstDisplayCol,
  hasImages,
  orderedCols,
  displayText,
  extractImageUrlsFromRow,
  TABLES,
  CabRatesTable,
  BikeRentalsTable,
  BusesTable,
  BookingsTable,
  CabBookingsTable,
  cabRatesById,
  BikeBookingsTable,
  TrackingTable,
  FormEditor,
  formEditorExtras,
  Pagination,
  onUpsert,
  onPatch,
  onDelete,
  onReload,
  tableOnlyMode = false
}) {
  const effectiveTab = tableOnlyMode ? "table" : tab;
  const setEffectiveTab = (nextTab) => {
    if (tableOnlyMode) return;
    setTab(nextTab);
  };
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const allowDeleteActions = ["hotels", "cottages", "tours", "explorevalley"].includes(page);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkActionTarget, setBulkActionTarget] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [externalPatch, setExternalPatch] = useState({ token: 0, data: null });
  const aiEnabledPages = ["explorevalley", "tours", "hotels", "cottages", "cab_providers", "bike_rentals", "buses"];
  const catalogPagesWithoutJson = ["tours", "hotels", "cottages"];
  const hideJsonUi = catalogPagesWithoutJson.includes(page);
  const showAiJsonAssistant = aiEnabledPages.includes(page) && !hideJsonUi;
  const activeSortKey = sortKey || firstDisplayCol || keyCol;
  const [statusBusyId, setStatusBusyId] = useState("");
  const [statusError, setStatusError] = useState("");
  const isMartOrdersTable = effectiveTable?.name === TABLES?.MART_ORDERS;

  const sortedRows = useMemo(() => {
    const list = Array.isArray(filteredRows) ? filteredRows.slice() : [];
    const dir = sortDir === "asc" ? 1 : -1;
    const key = activeSortKey;
    const toComparable = (value) => {
      if (value === null || value === undefined) return "";
      if (typeof value === "number") return value;
      if (typeof value === "boolean") return value ? 1 : 0;
      if (typeof value === "object") return JSON.stringify(value);
      const s = String(value).trim();
      const asNum = Number(s);
      if (Number.isFinite(asNum) && s !== "") return asNum;
      const asDate = Date.parse(s);
      if (Number.isFinite(asDate) && /[-/:T]/.test(s)) return asDate;
      return s.toLowerCase();
    };
    list.sort((a, b) => {
      const av = toComparable(a?.[key]);
      const bv = toComparable(b?.[key]);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return list;
  }, [filteredRows, activeSortKey, sortDir]);

  const sortableColumns = useMemo(() => {
    if (!effectiveTable) return [];
    const cols = Array.isArray(effectiveTable.columns) ? effectiveTable.columns.map((c) => c?.name).filter(Boolean) : [];
    const ordered = [firstDisplayCol, ...cols.filter((c) => c !== firstDisplayCol)];
    return Array.from(new Set(ordered));
  }, [effectiveTable, firstDisplayCol]);

  const visibleOrderedCols = useMemo(() => {
    const cols = Array.isArray(orderedCols) ? orderedCols.filter(Boolean) : [];
    if (!isMartOrdersTable || cols.includes("status")) return cols;
    const firstIdx = cols.indexOf(firstDisplayCol);
    const insertAt = firstIdx >= 0 ? firstIdx + 1 : 1;
    return [...cols.slice(0, insertAt), "status", ...cols.slice(insertAt)];
  }, [orderedCols, isMartOrdersTable, firstDisplayCol]);

  const pagedRows = useMemo(
    () => sortedRows.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE),
    [sortedRows, tablePage]
  );

  const rowKeyFor = (row, idx = 0) => String(row?.[keyCol] || row?.id || row?.slug || row?.code || row?.restaurant_id || idx);
  const pagedRowKeys = useMemo(() => pagedRows.map((row, idx) => rowKeyFor(row, idx)), [pagedRows, keyCol]);
  const allPagedSelected = !!pagedRowKeys.length && pagedRowKeys.every((rowKey) => selectedRowKeys.includes(rowKey));
  const selectedRows = useMemo(() => {
    const picked = new Set(selectedRowKeys);
    return sortedRows.filter((row, idx) => picked.has(rowKeyFor(row, idx)));
  }, [sortedRows, selectedRowKeys, keyCol]);

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [effectiveTable?.name, search, tablePage, activeSortKey, sortDir]);

  useEffect(() => {
    if (tableOnlyMode) return;
    if (hideJsonUi && tab === "json") setTab("form");
  }, [hideJsonUi, tab, tableOnlyMode, setTab]);

  const toggleRowSelected = (rowKey) => {
    setSelectedRowKeys((prev) => (
      prev.includes(rowKey)
        ? prev.filter((key) => key !== rowKey)
        : [...prev, rowKey]
    ));
  };

  const togglePageSelected = () => {
    setSelectedRowKeys((prev) => {
      if (allPagedSelected) return prev.filter((key) => !pagedRowKeys.includes(key));
      return Array.from(new Set([...prev, ...pagedRowKeys]));
    });
  };

  const makeDuplicateKeyValue = (baseValue, fallbackPrefix, offset = 0) => {
    const seed = String(baseValue || fallbackPrefix || "row").trim() || fallbackPrefix || "row";
    return `${seed.replace(/\s+/g, "_")}_copy_${Date.now()}_${offset + 1}`;
  };

  const buildDuplicatedRow = (row, index) => {
    const clone = JSON.parse(JSON.stringify(row || {}));
    const nextPrimaryKey = makeDuplicateKeyValue(clone?.[keyCol] || clone?.id || clone?.slug || clone?.code, keyCol || "row", index);
    clone[keyCol] = nextPrimaryKey;
    if ("id" in clone) clone.id = keyCol === "id" ? nextPrimaryKey : makeDuplicateKeyValue(clone.id, "id", index);
    if ("slug" in clone) clone.slug = keyCol === "slug" ? nextPrimaryKey : makeDuplicateKeyValue(clone.slug, "slug", index);
    if ("code" in clone) clone.code = keyCol === "code" ? nextPrimaryKey : makeDuplicateKeyValue(clone.code, "code", index);
    if ("title" in clone && String(clone.title || "").trim()) clone.title = `${String(clone.title).trim()} Copy`;
    if ("name" in clone && String(clone.name || "").trim()) clone.name = `${String(clone.name).trim()} Copy`;
    return clone;
  };

  const runBulkDelete = async () => {
    if (!selectedRows.length || !effectiveTable) return;
    setBulkBusy(true);
    try {
      for (const row of selectedRows) {
        const deleteId = String(row?.[keyCol] || row?.id || "");
        if (!deleteId) continue;
        await onDelete(effectiveTable.name, deleteId, keyCol, "DELETE");
      }
      await onReload();
      setSelectedRowKeys([]);
      setBulkActionTarget(null);
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkDuplicate = async () => {
    if (!selectedRows.length || !effectiveTable) return;
    setBulkBusy(true);
    try {
      await onUpsert(effectiveTable.name, selectedRows.map((row, index) => buildDuplicatedRow(row, index)));
      await onReload();
      setSelectedRowKeys([]);
      setBulkActionTarget(null);
    } finally {
      setBulkBusy(false);
    }
  };

  const setMartOrderStatus = async (row, nextStatus) => {
    if (!isMartOrdersTable || !effectiveTable) return;
    const rowId = String(row?.id || row?.[keyCol] || "");
    if (!rowId) return;
    setStatusBusyId(rowId);
    setStatusError("");
    try {
      await onUpsert(effectiveTable.name, [{
        ...(row || {}),
        id: rowId,
        status: nextStatus
      }]);
      await onReload();
    } catch (e) {
      setStatusError(String(e?.message || e));
    } finally {
      setStatusBusyId("");
    }
  };

  const renderTableCell = (row, name) => {
    const value = name === "status" && (row?.[name] === undefined || row?.[name] === null || row?.[name] === "") ? "pending" : row?.[name];
    if (isMartOrdersTable && name === "status") {
      const rowId = String(row?.id || row?.[keyCol] || "");
      const status = String(value || "pending").toLowerCase();
      return (
        <select
          className={`select status-select status-select-${normalizeStatusClass(status)}`}
          value={status}
          disabled={statusBusyId === rowId}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setMartOrderStatus(row, e.target.value)}
          title="Update mart order status"
        >
          {MART_ORDER_STATUSES.map((option) => <option key={option} value={option}>{titleValue(option)}</option>)}
        </select>
      );
    }
    const parsed = parseJsonValue(value);
    if (parsed && typeof parsed === "object") return <JsonObjectCell value={parsed} />;
    return displayText(value).slice(0, 100);
  };

  return (
    <>
      {currentTables.length > 1 ? (
        <div className="tabs">
          {currentTables.map((t) => (
            <button key={t.name} className={`tab ${selectedTable === t.name ? "active" : ""}`} onClick={() => setSelectedTable(t.name)}>
              <FaBuilding /> {tableLabel(t.name)}
            </button>
          ))}
        </div>
      ) : null}

      {!tableOnlyMode ? (
        <div className="tabs">
          <button className={`tab ${effectiveTab === "table" ? "active" : ""}`} onClick={() => setEffectiveTab("table")}><FaTable /> Table</button>
          <button className={`tab ${effectiveTab === "form" ? "active" : ""}`} onClick={() => setEffectiveTab("form")}><FaPen /> Form</button>
          {hideJsonUi ? null : <button className={`tab ${effectiveTab === "json" ? "active" : ""}`} onClick={() => setEffectiveTab("json")}><FaFileCode /> JSON</button>}
        </div>
      ) : null}

      {!effectiveTable ? (
        <div className="card">No Supabase table mapped for this section.</div>
      ) : null}

      {effectiveTable && effectiveTab === "table" ? (
        <div className="card">
          <div className="filters">
            <div className="pos-rel">
              <FaSearch className="search-icon" />
              <input className="input input-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
            </div>
            <div className="badge">{effectiveTable.rowCount} rows</div>
            <select className="input" value={activeSortKey} onChange={(e) => setSortKey(e.target.value)} title="Sort column">
              {sortableColumns.map((c) => <option key={c} value={c}>{columnLabel(effectiveTable.name, c)}</option>)}
            </select>
            <button className="btn" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>
              {sortDir === "asc" ? "Asc" : "Desc"}
            </button>
            <button className="btn" onClick={() => { setSelectedRowKey("__new__"); setTab("form"); }}><FaPlus /> Create</button>
            <button className="btn" onClick={() => {
              const blob = new Blob([JSON.stringify(sortedRows, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${activeTable.name}.json`;
              a.click();
            }}><FaDownload /> Export</button>
            {selectedRowKeys.length ? (
              <>
                <div className="badge">{selectedRowKeys.length} selected</div>
                <button className="btn" onClick={() => setBulkActionTarget({ type: "duplicate", count: selectedRows.length })}>Duplicate Selected</button>
                {allowDeleteActions ? (
                  <button className="btn danger" onClick={() => setBulkActionTarget({ type: "delete", count: selectedRows.length })}>Delete Selected</button>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="table-wrap mt-10">
            {statusError ? <div className="warn mb-10">{statusError}</div> : null}
            {page === "cab_providers" ? (
              <CabRatesTable rows={sortedRows} onUpsert={onUpsert} onDelete={onDelete} onReload={onReload} />
            ) : page === "bike_rentals" ? (
              <BikeRentalsTable rows={sortedRows} onUpsert={onUpsert} onDelete={onDelete} onReload={onReload} />
            ) : effectiveTable.name === TABLES.BUSES ? (
              <BusesTable rows={sortedRows} onUpsert={onUpsert} onDelete={onDelete} onReload={onReload} />
            ) : effectiveTable.name === TABLES.BOOKINGS ? (
              <BookingsTable
                rows={sortedRows.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE)}
                onPatch={onPatch}
                onOpenRow={(rowKey) => { setSelectedRowKey(rowKey); setTab("form"); }}
                onOpenImages={openImages}
                onUpsert={onUpsert}
                onReload={onReload}
                catalogLookup={catalogLookup}
              />
            ) : effectiveTable.name === TABLES.CAB_BOOKINGS ? (
              <CabBookingsTable
                rows={sortedRows.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE)}
                onPatch={onPatch}
                onOpenRow={(rowKey) => { setSelectedRowKey(rowKey); if (!tableOnlyMode) setEffectiveTab("form"); }}
                onUpsert={onUpsert}
                onReload={onReload}
                cabRatesById={cabRatesById}
              />
            ) : effectiveTable.name === TABLES.BIKE_BOOKINGS ? (
              <BikeBookingsTable
                rows={sortedRows.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE)}
                onPatch={onPatch}
                onOpenRow={(rowKey) => { setSelectedRowKey(rowKey); if (!tableOnlyMode) setEffectiveTab("form"); }}
                onUpsert={onUpsert}
                onReload={onReload}
              />
            ) : effectiveTable.name === TABLES.ANALYTICS_EVENTS && page === "tracking" ? (
              <TrackingTable rows={sortedRows.slice((tablePage - 1) * PAGE_SIZE, tablePage * PAGE_SIZE)} />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={allPagedSelected}
                        onChange={togglePageSelected}
                        aria-label="Select visible rows"
                      />
                    </th>
                    <th>{columnLabel(effectiveTable.name, firstDisplayCol)}</th>
                    {hasImages ? <th className="thumb-cell">image</th> : null}
                    {visibleOrderedCols.filter((n) => n !== firstDisplayCol).map((name) => <th key={name}>{columnLabel(effectiveTable.name, name)}</th>)}
                    {allowDeleteActions ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row, idx) => {
                    const rowKey = rowKeyFor(row, idx);
                    const deleteId = String(row[keyCol] || row.id || "");
                    const urls = hasImages ? extractImageUrlsFromRow(row) : [];
                    return (
                      <tr key={rowKey} onClick={() => { setSelectedRowKey(rowKey); if (!tableOnlyMode) setEffectiveTab("form"); }}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRowKeys.includes(rowKey)}
                            onChange={() => toggleRowSelected(rowKey)}
                            aria-label={`Select ${displayText(row[firstDisplayCol] ?? rowKey).slice(0, 60)}`}
                          />
                        </td>
                        <td>{displayText(row[firstDisplayCol] ?? "").slice(0, 120)}</td>
                        {hasImages ? (
                          <td className="thumb-cell" onClick={(e) => e.stopPropagation()}>
                            {urls[0] ? (
                              <img className="thumb" src={urls[0]} alt="" onClick={() => openImages(effectiveTable.name, urls, 0)} />
                            ) : null}
                          </td>
                        ) : null}
                        {visibleOrderedCols.filter((n) => n !== firstDisplayCol).map((name) => (
                          <td key={name} onClick={name === "status" ? (e) => e.stopPropagation() : undefined}>
                            {renderTableCell(row, name)}
                          </td>
                        ))}
                        {allowDeleteActions ? (
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn small danger"
                              disabled={!deleteId}
                              onClick={async () => {
                                if (!deleteId) return;
                                setDeleteTarget({
                                  tableName: effectiveTable.name,
                                  id: deleteId,
                                  keyColumn: keyCol
                                });
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {page === "cab_providers" || page === "bike_rentals" ? null : (
              <Pagination
                page={tablePage}
                totalPages={Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))}
                onChange={setTablePage}
              />
            )}
          </div>
        </div>
      ) : null}

      {effectiveTable && effectiveTab === "form" && !tableOnlyMode ? (
        <>
          {showAiJsonAssistant ? (
            <AIFormJsonAssistant
              contextKey={page}
              tableColumns={effectiveTable?.columns || []}
              currentForm={selectedRow || {}}
              showTemplate={false}
              showGenerated={true}
              showApplyButton={true}
              onApply={(data) => setExternalPatch({ token: Date.now(), data })}
            />
          ) : null}
          <FormEditor
            table={effectiveTable}
            selectedRow={selectedRow}
            onSave={saveForm}
            onOpenImages={openImages}
            onUpsertPartial={upsertPartial}
            contextPage={page}
            catalogLookup={catalogLookup}
            externalPatch={externalPatch}
            {...(formEditorExtras || {})}
          />
        </>
      ) : null}

      {activeTable && effectiveTab === "json" && !tableOnlyMode ? (
        <>
          {showAiJsonAssistant ? (
            <AIFormJsonAssistant
              contextKey={page}
              tableColumns={effectiveTable?.columns || []}
              currentForm={selectedRow || {}}
              showTemplate={true}
              showGenerated={false}
              showApplyButton={false}
              onApply={() => {}}
            />
          ) : null}
          <div className="card">
            <div className="small">Advanced: edit entire table as JSON array</div>
            <textarea className="textarea json-box mt-10" value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} />
            <div className="mt-10 flex-gap10">
              <button className="btn primary" onClick={saveJson}><FaLock /> Save JSON Changes</button>
              <button className="btn" onClick={() => setJsonDraft(JSON.stringify((effectiveTable?.rows) || (activeTable.rows || []), null, 2))}><FaRedo /> Reset</button>
            </div>
          </div>
        </>
      ) : null}

      {deleteTarget ? (
        <div className="modal-backdrop" onClick={() => (deleteBusy ? null : setDeleteTarget(null))}>
          <div className="modal card maxw-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="mt-0">Delete Row</h3>
            <div className="small">Are you sure you want to delete this row?</div>
            <div className="small mt-8">
              <strong>ID:</strong> {deleteTarget.id}
            </div>
            <div className="mt-12 flex-gap10">
              <button
                className="btn danger"
                disabled={deleteBusy}
                onClick={async () => {
                  setDeleteBusy(true);
                  try {
                    await onDelete(deleteTarget.tableName, deleteTarget.id, deleteTarget.keyColumn, "DELETE");
                    await onReload();
                    setDeleteTarget(null);
                  } finally {
                    setDeleteBusy(false);
                  }
                }}
              >
                {deleteBusy ? "Deleting..." : "Yes, Delete"}
              </button>
              <button className="btn" disabled={deleteBusy} onClick={() => setDeleteTarget(null)}>No</button>
            </div>
          </div>
        </div>
      ) : null}
      {bulkActionTarget ? (
        <div className="modal-backdrop" onClick={() => (bulkBusy ? null : setBulkActionTarget(null))}>
          <div className="modal card maxw-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="mt-0">{bulkActionTarget.type === "delete" ? "Delete Selected Rows" : "Duplicate Selected Rows"}</h3>
            <div className="small">
              {bulkActionTarget.type === "delete"
                ? `Delete ${bulkActionTarget.count} selected row${bulkActionTarget.count === 1 ? "" : "s"}?`
                : `Duplicate ${bulkActionTarget.count} selected row${bulkActionTarget.count === 1 ? "" : "s"}?`}
            </div>
            <div className="mt-12 flex-gap10">
              <button
                className={`btn ${bulkActionTarget.type === "delete" ? "danger" : "primary"}`}
                disabled={bulkBusy}
                onClick={bulkActionTarget.type === "delete" ? runBulkDelete : runBulkDuplicate}
              >
                {bulkBusy
                  ? (bulkActionTarget.type === "delete" ? "Deleting..." : "Duplicating...")
                  : (bulkActionTarget.type === "delete" ? "Yes, Continue" : "Yes, Duplicate")}
              </button>
              <button className="btn" disabled={bulkBusy} onClick={() => setBulkActionTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
