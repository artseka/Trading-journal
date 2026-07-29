"use client";

import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  Edit3,
  LogIn,
  LogOut,
  LockKeyhole,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Result = "win" | "loss" | "breakeven";
type Side = "buy" | "sell";

type Trade = {
  id: string;
  date: string;
  pair: string;
  side: Side;
  result: Result;
  pnl: number;
  rr: string;
  strategy: string;
  note: string;
  createdAt: string;
};

type JournalData = {
  trades: Trade[];
  capital: Record<string, number>;
};

type DatabaseTrade = {
  id: string;
  trade_date: string;
  pair: string;
  side: Side;
  result: Result;
  pnl: number | string;
  rr: string;
  strategy: string;
  note: string;
  created_at: string;
};

type TradeDraft = Omit<Trade, "id" | "date" | "createdAt">;

const STORAGE_KEY = "trading-journal-v1";
const monthNames = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const emptyDraft: TradeDraft = {
  pair: "",
  side: "buy",
  result: "win",
  pnl: 0,
  rr: "",
  strategy: "",
  note: "",
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date) {
  return dateKey(date).slice(0, 7);
}

function money(value: number, sign = false) {
  const prefix = sign && value > 0 ? "+" : "";
  return `${prefix}${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value)}`;
}

function safeLoad(): JournalData {
  if (typeof window === "undefined") return { trades: [], capital: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
    if (Array.isArray(parsed.trades) && parsed.capital && typeof parsed.capital === "object") {
      return parsed;
    }
  } catch {
    // A damaged local value should never stop the journal from opening.
  }
  return { trades: [], capital: {} };
}

function fromDatabaseTrade(trade: DatabaseTrade): Trade {
  return {
    id: trade.id,
    date: trade.trade_date,
    pair: trade.pair,
    side: trade.side,
    result: trade.result,
    pnl: Number(trade.pnl) || 0,
    rr: trade.rr || "",
    strategy: trade.strategy || "",
    note: trade.note || "",
    createdAt: trade.created_at,
  };
}

export default function TradingJournal() {
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<JournalData>({ trades: [], capital: {} });
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TradeDraft>(emptyDraft);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setAuthStatus(result.authenticated ? "authenticated" : "unauthenticated"))
      .catch(() => setAuthStatus("unauthenticated"));
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    setData(safeLoad());
    setReady(true);
    fetch("/api/journal", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = await response.json();
        const capital = Object.fromEntries(
          (result.capital || []).map((item: { month_key: string; amount: number | string }) => [
            item.month_key,
            Number(item.amount) || 0,
          ]),
        );
        setData({
          trades: (result.trades || []).map(fromDatabaseTrade),
          capital,
        });
      })
      .catch(() => setToast("โหลดคลาวด์ไม่สำเร็จ กำลังใช้ข้อมูลสำรองในเครื่อง"));
  }, [authStatus]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const currentMonthKey = monthKey(viewDate);
  const monthTrades = useMemo(
    () => data.trades.filter((trade) => trade.date.startsWith(currentMonthKey)),
    [data.trades, currentMonthKey],
  );
  const filteredMonthTrades = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return monthTrades;
    return monthTrades.filter((trade) =>
      [trade.pair, trade.strategy, trade.note].some((field) => field.toLowerCase().includes(term)),
    );
  }, [monthTrades, query]);

  const stats = useMemo(() => {
    const net = monthTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const wins = monthTrades.filter((trade) => trade.result === "win").length;
    const losses = monthTrades.filter((trade) => trade.result === "loss").length;
    const gain = monthTrades.filter((trade) => trade.pnl > 0).reduce((sum, trade) => sum + trade.pnl, 0);
    const loss = monthTrades.filter((trade) => trade.pnl < 0).reduce((sum, trade) => sum + trade.pnl, 0);
    const decided = wins + losses;
    return {
      net,
      wins,
      losses,
      gain,
      loss,
      winRate: decided ? Math.round((wins / decided) * 100) : 0,
    };
  }, [monthTrades]);

  const selectedTrades = useMemo(
    () => data.trades.filter((trade) => trade.date === selectedDate).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.trades, selectedDate],
  );

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: total }, (_, index) => new Date(year, month, index + 1)),
    ];
  }, [viewDate]);

  const openDate = (key: string) => {
    setSelectedDate(key);
    setEditingId(null);
    setDraft(emptyDraft);
    setShowForm(data.trades.every((trade) => trade.date !== key));
  };

  const closeModal = () => {
    setSelectedDate(null);
    setEditingId(null);
    setShowForm(false);
    setDraft(emptyDraft);
  };

  const saveTrade = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDate || !draft.pair.trim()) return;
    const normalized: TradeDraft = {
      ...draft,
      pair: draft.pair.trim().toUpperCase(),
      strategy: draft.strategy.trim(),
      note: draft.note.trim(),
      pnl: Number(draft.pnl) || 0,
    };

    if (editingId) {
      const response = await fetch(`/api/trades/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(normalized),
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result) || !result[0]) {
        window.alert("บันทึกการแก้ไขไม่สำเร็จ กรุณาลองอีกครั้ง");
        return;
      }
      const saved = fromDatabaseTrade(result[0]);
      setData((current) => ({
        ...current,
        trades: current.trades.map((trade) => trade.id === editingId ? saved : trade),
      }));
      setToast("แก้ไขรายการเรียบร้อย");
    } else {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...normalized, date: selectedDate }),
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result) || !result[0]) {
        window.alert("บันทึกเทรดไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองอีกครั้ง");
        return;
      }
      const saved = fromDatabaseTrade(result[0]);
      setData((current) => ({ ...current, trades: [...current.trades, saved] }));
      setToast("บันทึกการเทรดแล้ว");
    }
    setDraft(emptyDraft);
    setEditingId(null);
    setShowForm(false);
  };

  const editTrade = (trade: Trade) => {
    const { id, date, createdAt, ...values } = trade;
    void date;
    void createdAt;
    setEditingId(id);
    setDraft(values);
    setShowForm(true);
  };

  const deleteTrade = async (id: string) => {
    if (!window.confirm("ลบรายการเทรดนี้ใช่หรือไม่?")) return;
    const response = await fetch(`/api/trades/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      window.alert("ลบรายการไม่สำเร็จ กรุณาลองอีกครั้ง");
      return;
    }
    setData((current) => ({ ...current, trades: current.trades.filter((trade) => trade.id !== id) }));
    setToast("ลบรายการแล้ว");
  };

  const changeMonth = (offset: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const updateCapital = (value: string) => {
    const amount = Math.max(0, Number(value) || 0);
    setData((current) => ({
      ...current,
      capital: { ...current.capital, [currentMonthKey]: amount },
    }));
  };

  const persistCapital = async () => {
    const response = await fetch("/api/capital", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        monthKey: currentMonthKey,
        amount: data.capital[currentMonthKey] || 0,
      }),
    });
    setToast(response.ok ? "บันทึกทุนขึ้นคลาวด์แล้ว" : "บันทึกทุนไม่สำเร็จ");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `trading-journal-backup-${dateKey(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("ดาวน์โหลดไฟล์สำรองแล้ว");
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.trades) || typeof parsed.capital !== "object") throw new Error();
        const response = await fetch("/api/journal", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsed),
        });
        if (!response.ok) throw new Error();
        setData(parsed);
        const cloudResponse = await fetch("/api/journal", { cache: "no-store" });
        if (cloudResponse.ok) {
          const cloud = await cloudResponse.json();
          setData({
            trades: (cloud.trades || []).map(fromDatabaseTrade),
            capital: Object.fromEntries(
              (cloud.capital || []).map((item: { month_key: string; amount: number | string }) => [
                item.month_key,
                Number(item.amount) || 0,
              ]),
            ),
          });
        }
        setToast("นำเข้าข้อมูลขึ้นคลาวด์สำเร็จ");
      } catch {
        window.alert("ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Trading Journal");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        setLoginError(result.message || "ไม่สามารถเข้าสู่ระบบได้");
        return;
      }
      setLoginPassword("");
      setAuthStatus("authenticated");
    } catch {
      setLoginError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setReady(false);
    setAuthStatus("unauthenticated");
    setLoginPassword("");
  };

  if (authStatus === "checking") return <div className="loading">กำลังตรวจสอบการเข้าสู่ระบบ…</div>;

  if (authStatus === "unauthenticated") {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-mark"><TrendingUp size={28} strokeWidth={2.5} /></div>
          <p className="login-eyebrow">PERSONAL TRADING WORKSPACE</p>
          <h1>ยินดีต้อนรับกลับ</h1>
          <p className="login-caption">เข้าสู่ระบบเพื่อเปิด Trading Journal ของคุณ</p>
          <form onSubmit={login}>
            <label>
              <span>Username</span>
              <input autoComplete="username" required value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} placeholder="กรอก Username" />
            </label>
            <label>
              <span>Password</span>
              <input type="password" autoComplete="current-password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="กรอก Password" />
            </label>
            {loginError && <div className="login-error">{loginError}</div>}
            <button disabled={loginBusy} type="submit"><LogIn size={17} /> {loginBusy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
          </form>
          <div className="login-security"><LockKeyhole size={13} /> พื้นที่ส่วนตัวสำหรับเจ้าของบัญชีเท่านั้น</div>
        </section>
      </main>
    );
  }

  if (!ready) return <div className="loading">กำลังเปิดสมุดบันทึก…</div>;

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><TrendingUp size={23} strokeWidth={2.4} /></div>
          <div>
            <p className="eyebrow">PERSONAL WORKSPACE</p>
            <h1>Trading Journal</h1>
          </div>
        </div>
        <div className="top-actions">
          <span className="local-status cloud-status"><Cloud size={14} /> ซิงก์กับ Supabase</span>
          <button className="icon-text-button" onClick={exportData}><Download size={16} /> สำรองข้อมูล</button>
          <button className="icon-text-button logout-button" onClick={logout}><LogOut size={16} /> ออกจากระบบ</button>
          <button className="icon-button mobile-import" onClick={() => importRef.current?.click()} aria-label="นำเข้าข้อมูล"><Upload size={18} /></button>
          <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importData} />
        </div>
      </header>

      <section className="hero-row">
        <div>
          <p className="section-kicker">ภาพรวมประจำเดือน</p>
          <h2>{monthNames[viewDate.getMonth()]} <span>{viewDate.getFullYear() + 543}</span></h2>
          <p className="hero-caption">ติดตามวินัย เรียนรู้จากทุกการตัดสินใจ</p>
        </div>
        <div className="month-nav">
          <button onClick={() => changeMonth(-1)} aria-label="เดือนก่อนหน้า"><ChevronLeft size={20} /></button>
          <button className="today-button" onClick={() => setViewDate(new Date())}>เดือนนี้</button>
          <button onClick={() => changeMonth(1)} aria-label="เดือนถัดไป"><ChevronRight size={20} /></button>
        </div>
      </section>

      <section className="stat-grid">
        <article className="stat-card primary-stat">
          <div className="stat-label"><WalletCards size={17} /> กำไรสุทธิ</div>
          <strong className={stats.net >= 0 ? "positive" : "negative"}>{money(stats.net, true)}</strong>
          <small>จาก {monthTrades.length} รายการในเดือนนี้</small>
        </article>
        <article className="stat-card">
          <div className="stat-label"><Target size={17} /> Win rate</div>
          <strong>{stats.winRate}<em>%</em></strong>
          <small><span className="positive">{stats.wins} ชนะ</span> · <span className="negative">{stats.losses} แพ้</span></small>
        </article>
        <article className="stat-card">
          <div className="stat-label"><ArrowUpRight size={17} /> กำไรรวม</div>
          <strong className="positive">{money(stats.gain, true)}</strong>
          <small>ผลลัพธ์ที่เป็นบวก</small>
        </article>
        <article className="stat-card">
          <div className="stat-label"><ArrowDownRight size={17} /> ขาดทุนรวม</div>
          <strong className="negative">{money(stats.loss)}</strong>
          <small>ผลลัพธ์ที่เป็นลบ</small>
        </article>
      </section>

      <section className="workspace">
        <div className="calendar-card">
          <div className="calendar-toolbar">
            <div>
              <h3><CalendarDays size={19} /> ปฏิทินการเทรด</h3>
              <p>แตะวันที่เพื่อดูหรือเพิ่มรายการ</p>
            </div>
            <label className="capital-field">
              <span>ทุนเริ่มต้นเดือนนี้</span>
              <div><b>$</b><input type="number" min="0" value={data.capital[currentMonthKey] ?? ""} placeholder="0" onChange={(e) => updateCapital(e.target.value)} onBlur={persistCapital} /></div>
            </label>
          </div>
          <div className="weekday-grid">
            {weekdays.map((day, index) => <div className={index === 0 || index === 6 ? "weekend-label" : ""} key={day}>{day}</div>)}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((day, index) => {
              if (!day) return <div className="day-cell blank" key={`blank-${index}`} />;
              const key = dateKey(day);
              const dayTrades = filteredMonthTrades.filter((trade) => trade.date === key);
              const allDayTrades = monthTrades.filter((trade) => trade.date === key);
              const pnl = allDayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
              const isToday = key === dateKey(new Date());
              const weekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <button className={`day-cell ${isToday ? "today" : ""} ${weekend ? "weekend" : ""}`} key={key} onClick={() => openDate(key)}>
                  <div className="day-head">
                    <span>{day.getDate()}</span>
                    {allDayTrades.length > 0 && <i>{allDayTrades.length}</i>}
                  </div>
                  {allDayTrades.length > 0 ? (
                    <>
                      <b className={pnl >= 0 ? "positive" : "negative"}>{money(pnl, true)}</b>
                      <div className="result-dots">
                        {allDayTrades.slice(0, 5).map((trade) => <i className={trade.result} key={trade.id} />)}
                      </div>
                    </>
                  ) : !weekend ? (
                    <span className="add-hint"><Plus size={15} /></span>
                  ) : null}
                  {query && dayTrades.length === 0 && allDayTrades.length > 0 && <span className="filtered-mark">ไม่ตรงตัวกรอง</span>}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="side-panel">
          <div className="search-box">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาคู่เงิน กลยุทธ์…" />
            {query && <button onClick={() => setQuery("")}><X size={15} /></button>}
          </div>
          <div className="side-heading">
            <div>
              <h3>รายการล่าสุด</h3>
              <p>{filteredMonthTrades.length} รายการ</p>
            </div>
          </div>
          <div className="recent-list">
            {filteredMonthTrades.length === 0 ? (
              <div className="empty-list"><CalendarDays size={28} /><p>ยังไม่มีรายการในเดือนนี้</p><span>เลือกวันที่บนปฏิทินเพื่อเริ่มบันทึก</span></div>
            ) : filteredMonthTrades.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((trade) => (
              <button className="recent-item" key={trade.id} onClick={() => openDate(trade.date)}>
                <span className={`side-icon ${trade.side}`} >{trade.side === "buy" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</span>
                <span className="recent-main"><b>{trade.pair}</b><small>{Number(trade.date.slice(8))} {monthNames[Number(trade.date.slice(5, 7)) - 1]} · {trade.side.toUpperCase()}</small></span>
                <strong className={trade.pnl >= 0 ? "positive" : "negative"}>{money(trade.pnl, true)}</strong>
              </button>
            ))}
          </div>
          <div className="backup-card">
            <div><Download size={18} /><span><b>สำรองข้อมูลล่าสุด</b><small>เก็บไฟล์ไว้ใน Drive หรือ iCloud</small></span></div>
            <div className="backup-actions">
              <button onClick={exportData}>ส่งออก</button>
              <button onClick={() => importRef.current?.click()}><Upload size={14} /> นำเข้า</button>
            </div>
          </div>
        </aside>
      </section>

      {selectedDate && (
        <div className="modal-backdrop" onMouseDown={(e) => e.currentTarget === e.target && closeModal()}>
          <section className="trade-modal" role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <p>บันทึกประจำวัน</p>
                <h3>{Number(selectedDate.slice(8))} {monthNames[Number(selectedDate.slice(5, 7)) - 1]} {Number(selectedDate.slice(0, 4)) + 543}</h3>
              </div>
              <button onClick={closeModal} aria-label="ปิด"><X size={20} /></button>
            </header>

            {showForm ? (
              <form className="trade-form" onSubmit={saveTrade}>
                <div className="field full">
                  <label>คู่เงิน / สินทรัพย์ <sup>*</sup></label>
                  <input autoFocus required value={draft.pair} onChange={(e) => setDraft({ ...draft, pair: e.target.value })} placeholder="เช่น XAU/USD, BTC/USDT" />
                </div>
                <div className="field">
                  <label>ประเภท</label>
                  <div className="segmented">
                    <button type="button" className={draft.side === "buy" ? "active buy" : ""} onClick={() => setDraft({ ...draft, side: "buy" })}><ArrowUpRight size={15} /> Buy</button>
                    <button type="button" className={draft.side === "sell" ? "active sell" : ""} onClick={() => setDraft({ ...draft, side: "sell" })}><ArrowDownRight size={15} /> Sell</button>
                  </div>
                </div>
                <div className="field">
                  <label>ผลลัพธ์</label>
                  <select value={draft.result} onChange={(e) => setDraft({ ...draft, result: e.target.value as Result })}>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="breakeven">Breakeven</option>
                  </select>
                </div>
                <div className="field">
                  <label>กำไร / ขาดทุน ($)</label>
                  <input type="number" step="0.01" value={draft.pnl} onChange={(e) => setDraft({ ...draft, pnl: Number(e.target.value) })} />
                </div>
                <div className="field">
                  <label>RR Ratio</label>
                  <input value={draft.rr} onChange={(e) => setDraft({ ...draft, rr: e.target.value })} placeholder="เช่น 1:2" />
                </div>
                <div className="field full">
                  <label>กลยุทธ์ / เซตอัป</label>
                  <input value={draft.strategy} onChange={(e) => setDraft({ ...draft, strategy: e.target.value })} placeholder="เช่น Breakout, Support bounce" />
                </div>
                <div className="field full">
                  <label>บันทึกเพิ่มเติม</label>
                  <textarea rows={3} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="สิ่งที่ทำได้ดี ข้อผิดพลาด หรืออารมณ์ระหว่างเทรด…" />
                </div>
                <footer className="form-footer">
                  <button type="button" className="secondary" onClick={() => { setShowForm(false); setEditingId(null); setDraft(emptyDraft); }}>ยกเลิก</button>
                  <button type="submit" className="save-button"><Check size={17} /> {editingId ? "บันทึกการแก้ไข" : "บันทึกเทรด"}</button>
                </footer>
              </form>
            ) : (
              <div className="day-trades">
                <div className="day-summary">
                  <span>{selectedTrades.length} รายการ</span>
                  <strong className={selectedTrades.reduce((sum, t) => sum + t.pnl, 0) >= 0 ? "positive" : "negative"}>
                    {money(selectedTrades.reduce((sum, t) => sum + t.pnl, 0), true)}
                  </strong>
                </div>
                {selectedTrades.length === 0 && <div className="modal-empty">ยังไม่มีรายการในวันนี้</div>}
                {selectedTrades.map((trade) => (
                  <article className="trade-row" key={trade.id}>
                    <span className={`trade-direction ${trade.side}`}>{trade.side === "buy" ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}</span>
                    <div className="trade-details">
                      <div><h4>{trade.pair}</h4><span className={`result-pill ${trade.result}`}>{trade.result === "win" ? "WIN" : trade.result === "loss" ? "LOSS" : "BE"}</span></div>
                      <p>{trade.strategy || "ไม่ระบุกลยุทธ์"} {trade.rr && `· RR ${trade.rr}`}</p>
                      {trade.note && <small>{trade.note}</small>}
                    </div>
                    <div className="trade-result">
                      <strong className={trade.pnl >= 0 ? "positive" : "negative"}>{money(trade.pnl, true)}</strong>
                      <div><button onClick={() => editTrade(trade)} aria-label="แก้ไข"><Edit3 size={15} /></button><button className="delete" onClick={() => deleteTrade(trade.id)} aria-label="ลบ"><Trash2 size={15} /></button></div>
                    </div>
                  </article>
                ))}
                <button className="add-trade-button" onClick={() => { setDraft(emptyDraft); setEditingId(null); setShowForm(true); }}><Plus size={18} /> เพิ่มรายการเทรด</button>
              </div>
            )}
          </section>
        </div>
      )}

      {toast && <div className="toast"><Check size={16} /> {toast}</div>}
    </main>
  );
}
