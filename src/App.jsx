import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

function Card({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function Button({ className = "", variant = "default", children, ...props }) {
  const base = "inline-flex items-center justify-center border font-medium transition disabled:opacity-50";
  const style =
    variant === "outline"
      ? "bg-white text-slate-900 border-slate-300 hover:bg-slate-50"
      : variant === "ghost"
      ? "bg-transparent border-transparent text-slate-700 hover:bg-slate-100"
      : "bg-slate-950 text-white border-slate-950 hover:bg-slate-800";

  return (
    <button className={`${base} ${style} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300 ${className}`}
      {...props}
    />
  );
}

const queues = [
  { key: "O", label: "HALL O", subtitle: "Oxygaz" },
  { key: "P", label: "HALL P", subtitle: "Plasma" },
  { key: "L", label: "HALL L", subtitle: "Laser" },
];

const defaultOrderPrefix = "ZR26-";

const createEmptyManualForm = (prefix = defaultOrderPrefix) => ({
  order: prefix,
  client: "",
  jobNumber: "",
  thickness: "",
  minutes: "",
  deadline: "",
  machine: "",
  note: "",
});

const statusClass = {
  Ready: "bg-slate-100 text-slate-800",
  "In progress": "bg-blue-100 text-blue-800",
  Done: "bg-green-200 text-green-900",
  Problem: "bg-red-100 text-red-800",
};

function getStatusLabel(status) {
  if (status === "Ready") return "Ready";
  if (status === "In progress") return "Started";
  if (status === "Done") return "Done";
  if (status === "Problem") return "Problem";
  return status;
}

function isVisibleInWorkingQueue(job) {
  if (job.status !== "Done") return true;
  if (!job.doneAt) return true;
  const doneTime = new Date(job.doneAt).getTime();
  if (Number.isNaN(doneTime)) return true;
  const ageDays = (Date.now() - doneTime) / (1000 * 60 * 60 * 24);
  return ageDays <= 7;
}

function getCardStyle(job) {
  if (job.status === "Done") return "bg-green-100 border-green-300";
  if (job.priorityOne) return "bg-yellow-100 border-yellow-300";
  return "bg-white border-slate-200";
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function JobCard({ job, onStatusToggle, onMove, onPriorityToggle, onEdit }) {
  const startActive = job.status === "In progress";
  const doneActive = job.status === "Done";
  const problemActive = job.status === "Problem";

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`rounded-2xl shadow-sm overflow-hidden border ${getCardStyle(job)}`}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className="pt-1 text-slate-400 cursor-grab text-sm">::</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-950 truncate text-sm md:text-base">{job.order}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {job.client} - Job {job.jobNumber}
                  </div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${statusClass[job.status] || statusClass.Ready}`}>
                  {getStatusLabel(job.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-xs md:text-sm">
                <div className="text-slate-700">Thk: {job.thickness}</div>
                <div className="text-slate-700">Time: {job.minutes} min</div>
                <div className="text-slate-700">DL: {job.deadline}</div>
                <div className="text-slate-700">Machine: {job.machine}</div>
              </div>

              {job.note ? <div className="mt-2 text-xs bg-white/60 rounded-xl px-2 py-1.5 text-slate-700">Note: {job.note}</div> : null}

              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button variant={startActive ? "default" : "outline"} className="rounded-xl text-sm px-4 h-10 w-full font-semibold" onClick={() => onStatusToggle(job.id, "In progress")}>
                  START
                </Button>
                <Button variant={doneActive ? "default" : "outline"} className="rounded-xl text-sm px-4 h-10 w-full font-semibold" onClick={() => onStatusToggle(job.id, "Done")}>
                  DONE
                </Button>
                <Button variant={problemActive ? "default" : "outline"} className="rounded-xl text-sm px-4 h-10 w-full font-semibold" onClick={() => onStatusToggle(job.id, "Problem")}>
                  PROBLEM
                </Button>
                <Button variant={job.priorityOne ? "default" : "outline"} className="rounded-xl text-sm px-4 h-10 w-full font-semibold" onClick={() => onPriorityToggle(job.id)}>
                  P1
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                <Button size="sm" variant="ghost" className="rounded-xl text-xs h-7 px-3" onClick={() => onMove(job.id, -1)}>Up</Button>
                <Button size="sm" variant="ghost" className="rounded-xl text-xs h-7 px-3" onClick={() => onMove(job.id, 1)}>Down</Button>
                <Button size="sm" variant="ghost" className="rounded-xl text-xs h-7 px-3" onClick={() => onEdit(job)}>Edit</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function SvodkyAppPrototype() {
  const [jobs, setJobs] = useState(() => {
    try {
      const savedJobs = window.localStorage.getItem("svodky-jobs");
      return savedJobs ? JSON.parse(savedJobs) : [];
    } catch {
      return [];
    }
  });

  const [activeQueue, setActiveQueue] = useState("O");
  const [search, setSearch] = useState("");
  const [showMode, setShowMode] = useState("open");
  const [editingId, setEditingId] = useState(null);
  const [orderPrefix, setOrderPrefix] = useState(defaultOrderPrefix);
  const [manual, setManual] = useState(createEmptyManualForm(defaultOrderPrefix));

  useEffect(() => {
    window.localStorage.setItem("svodky-jobs", JSON.stringify(jobs));
  }, [jobs]);

  const active = queues.find((queue) => queue.key === activeQueue) || queues[0];

  const visibleJobs = useMemo(() => {
    return jobs
      .filter((job) => job.queue === activeQueue)
      .filter(isVisibleInWorkingQueue)
      .filter((job) => (showMode === "all" ? true : job.status !== "Done"))
      .filter((job) => {
        const haystack = [job.order, job.client, job.jobNumber, job.note].join(" ").toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .sort((a, b) => {
        if (a.priorityOne !== b.priorityOne) return a.priorityOne ? -1 : 1;
        return (a.priority || 0) - (b.priority || 0);
      });
  }, [jobs, activeQueue, search, showMode]);

  const dashboardStats = useMemo(() => {
    return queues.reduce((acc, queue) => {
      const queueJobs = jobs.filter((job) => job.queue === queue.key && job.status !== "Done");
      acc[queue.key] = {
        count: queueJobs.length,
        minutes: queueJobs.reduce((sum, job) => sum + (Number(job.minutes) || 0), 0),
      };
      return acc;
    }, {});
  }, [jobs]);

  const resetForm = () => {
    setEditingId(null);
    setManual(createEmptyManualForm(orderPrefix));
  };

  const updateOrderPrefix = (value) => {
    setOrderPrefix(value);
    if (!editingId && (manual.order === orderPrefix || manual.order.trim() === "")) {
      setManual({ ...manual, order: value });
    }
  };

  const addOrUpdateJob = () => {
    if (!manual.order.trim() || !manual.client.trim() || !manual.jobNumber.trim()) return;

    const cleanedJobFields = {
      order: manual.order.trim(),
      client: manual.client.trim(),
      jobNumber: manual.jobNumber.trim(),
      thickness: manual.thickness.trim() || "?",
      minutes: Number(manual.minutes) || 0,
      deadline: manual.deadline.trim() || "no deadline",
      machine: manual.machine.trim() || active.subtitle,
      note: manual.note.trim(),
    };

    if (editingId) {
      setJobs((currentJobs) => currentJobs.map((job) => (job.id === editingId ? { ...job, ...cleanedJobFields } : job)));
      resetForm();
      return;
    }

    const maxPriority = Math.max(0, ...jobs.filter((job) => job.queue === activeQueue).map((job) => job.priority || 0));
    const newJob = {
      id: `J${Date.now()}`,
      queue: activeQueue,
      ...cleanedJobFields,
      status: "Ready",
      priorityOne: false,
      doneAt: null,
      priority: maxPriority + 1,
    };

    setJobs((currentJobs) => [...currentJobs, newJob]);
    resetForm();
  };

  const toggleStatus = (id, wantedStatus) => {
    setJobs((currentJobs) =>
      currentJobs.map((job) => {
        if (job.id !== id) return job;
        const nextStatus = job.status === wantedStatus ? "Ready" : wantedStatus;
        return { ...job, status: nextStatus, doneAt: nextStatus === "Done" ? new Date().toISOString() : null };
      })
    );
  };

  const togglePriorityOne = (id) => {
    setJobs((currentJobs) => currentJobs.map((job) => (job.id === id ? { ...job, priorityOne: !job.priorityOne } : job)));
  };

  const editJob = (job) => {
    setEditingId(job.id);
    setActiveQueue(job.queue);
    setManual({
      order: job.order,
      client: job.client,
      jobNumber: job.jobNumber,
      thickness: job.thickness,
      minutes: String(job.minutes || ""),
      deadline: job.deadline,
      machine: job.machine,
      note: job.note || "",
    });
    document.getElementById("manual-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const moveJob = (id, direction) => {
    const selected = jobs.find((job) => job.id === id);
    if (!selected) return;

    const sameQueue = jobs
      .filter((job) => job.queue === selected.queue)
      .sort((a, b) => {
        if (a.priorityOne !== b.priorityOne) return a.priorityOne ? -1 : 1;
        return (a.priority || 0) - (b.priority || 0);
      });

    const index = sameQueue.findIndex((job) => job.id === id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sameQueue.length) return;
    const target = sameQueue[targetIndex];

    setJobs((currentJobs) =>
      currentJobs.map((job) => {
        if (job.id === selected.id) return { ...job, priority: target.priority, priorityOne: target.priorityOne };
        if (job.id === target.id) return { ...job, priority: selected.priority, priorityOne: selected.priorityOne };
        return job;
      })
    );
  };

  const addTestJobs = () => {
    const today = new Date().toISOString();
    const oldDoneDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

    setJobs([
      { id: "TEST-1", queue: "O", order: "ZR26-TEST-001", client: "VESTAS", jobNumber: "947 0001", thickness: "20 mm", minutes: 120, deadline: "14.05.2026", machine: "Oxy 1", note: "test open job", status: "Ready", priorityOne: false, doneAt: null, priority: 1 },
      { id: "TEST-2", queue: "O", order: "ZR26-TEST-002", client: "REGNO", jobNumber: "947 0002", thickness: "30 mm", minutes: 60, deadline: "15.05.2026", machine: "Oxy 2", note: "test done today", status: "Done", priorityOne: false, doneAt: today, priority: 2 },
      { id: "TEST-3", queue: "O", order: "ZR26-TEST-003", client: "ADEMA", jobNumber: "947 0003", thickness: "15 mm", minutes: 90, deadline: "16.05.2026", machine: "Oxy 1", note: "test done older than 7 days - should be hidden", status: "Done", priorityOne: false, doneAt: oldDoneDate, priority: 3 },
      { id: "TEST-4", queue: "P", order: "ZR26-TEST-004", client: "TC TECHNIC", jobNumber: "947 0004", thickness: "10 mm", minutes: 45, deadline: "17.05.2026", machine: "Plasma", note: "test plasma priority 1", status: "Ready", priorityOne: true, doneAt: null, priority: 1 },
      { id: "TEST-5", queue: "L", order: "ZR26-TEST-005", client: "LASER TEST", jobNumber: "947 0005", thickness: "5 mm", minutes: 35, deadline: "18.05.2026", machine: "Laser", note: "test laser", status: "Ready", priorityOne: false, doneAt: null, priority: 1 },
    ]);
    setActiveQueue("O");
    setShowMode("all");
    resetForm();
  };

  const clearAllJobs = () => {
    setJobs([]);
    resetForm();
  };

  const exportVisibleQueueToCsv = () => {
    const headers = ["Queue", "Order", "Client", "Job number", "Thickness", "Minutes", "Deadline", "Machine", "Status", "Priority 1", "Done at", "Note"];
    const rows = visibleJobs.map((job) => [job.queue, job.order, job.client, job.jobNumber, job.thickness, job.minutes, job.deadline, job.machine, getStatusLabel(job.status), job.priorityOne ? "YES" : "NO", job.doneAt || "", job.note || ""]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `svodky_${active.key}_${showMode}_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeStats = dashboardStats[activeQueue] || { count: 0, minutes: 0 };

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-950">SVODKY - production queue</h1>
            <p className="text-slate-600 mt-1 text-sm md:text-base">Cuius Regio Eius Religio</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="rounded-2xl h-11 min-w-[180px] px-5 text-sm font-semibold" onClick={exportVisibleQueueToCsv}>Export queue to Excel</Button>
            <Button className="rounded-2xl h-11 min-w-[180px] px-5 text-sm font-semibold" onClick={() => document.getElementById("manual-form")?.scrollIntoView({ behavior: "smooth" })}>+ Add job manually</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {queues.map((queue) => {
            const stats = dashboardStats[queue.key] || { count: 0, minutes: 0 };
            const isActive = activeQueue === queue.key;
            return (
              <button key={queue.key} onClick={() => setActiveQueue(queue.key)} className={`rounded-2xl p-3 text-left shadow-sm border transition ${isActive ? "bg-slate-950 text-white border-slate-950" : "bg-white text-slate-900 border-slate-200"}`}>
                <div className="text-base font-bold">{queue.label}</div>
                <div className={`text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>{queue.subtitle}</div>
                <div className="text-xl font-bold mt-2">{stats.count} jobs</div>
                <div className={`text-xs mt-1 ${isActive ? "text-slate-300" : "text-slate-500"}`}>{stats.minutes} min in queue</div>
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-4">
          <div className="space-y-3">
            <Card className="rounded-2xl shadow-sm border-slate-200 bg-white">
              <CardContent className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-950">{active.label} - {active.subtitle}</h2>
                  <p className="text-xs md:text-sm text-slate-500">Card order = production priority. P1 jobs are moved to the top automatically.</p>
                  <p className="text-xs text-slate-400 mt-1">Open now: {activeStats.count} jobs - {activeStats.minutes} min</p>
                  <p className="text-xs text-slate-400 mt-1">Export uses the currently selected queue, filter and search.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant={showMode === "open" ? "default" : "outline"} className="rounded-2xl h-11 min-w-[120px] px-5 text-sm font-semibold" onClick={() => setShowMode("open")}>Open</Button>
                  <Button variant={showMode === "all" ? "default" : "outline"} className="rounded-2xl h-11 min-w-[120px] px-5 text-sm font-semibold" onClick={() => setShowMode("all")}>All</Button>
                </div>
                <div className="relative w-full md:w-72">
                  <span className="absolute left-3 top-2.5 text-slate-400">?</span>
                  <Input className="pl-9 rounded-xl h-11 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search job / client / order" />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {visibleJobs.map((job) => (
                <JobCard key={job.id} job={job} onStatusToggle={toggleStatus} onMove={moveJob} onPriorityToggle={togglePriorityOne} onEdit={editJob} />
              ))}
              {visibleJobs.length === 0 ? (
                <Card className="rounded-2xl border-dashed shadow-sm bg-white border border-slate-200">
                  <CardContent className="p-8 text-center text-slate-500">No jobs in this queue.</CardContent>
                </Card>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <Card className="rounded-2xl shadow-sm border-slate-200 bg-white">
              <CardContent className="p-3">
                <h3 id="manual-form" className="font-bold text-lg text-slate-950">{editingId ? "Edit job" : "Add job manually"}</h3>
                <p className="text-sm text-slate-500 mt-1">First version copies today Excel workflow: fill in a few fields, check them and add the job to the selected queue.</p>
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-[95px_1fr] gap-2">
                    <Input className="rounded-xl" placeholder="ZR26-" value={orderPrefix} onChange={(event) => updateOrderPrefix(event.target.value)} />
                    <Input className="rounded-xl" placeholder="Order / COMANDA, e.g. ZR26-01301" value={manual.order} onChange={(event) => setManual({ ...manual, order: event.target.value })} />
                  </div>
                  <Input className="rounded-xl w-full" placeholder="Client, e.g. VESTAS" value={manual.client} onChange={(event) => setManual({ ...manual, client: event.target.value })} />
                  <Input className="rounded-xl w-full" placeholder="Job number, e.g. 947 0711" value={manual.jobNumber} onChange={(event) => setManual({ ...manual, jobNumber: event.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input className="rounded-xl w-full" placeholder="Thickness, e.g. 20 mm" value={manual.thickness} onChange={(event) => setManual({ ...manual, thickness: event.target.value })} />
                    <Input className="rounded-xl w-full" placeholder="Minutes" value={manual.minutes} onChange={(event) => setManual({ ...manual, minutes: event.target.value })} />
                  </div>
                  <Input className="rounded-xl w-full" placeholder="Deadline, e.g. 14.05.2026" value={manual.deadline} onChange={(event) => setManual({ ...manual, deadline: event.target.value })} />
                  <Input className="rounded-xl w-full" placeholder="Machine / machine note" value={manual.machine} onChange={(event) => setManual({ ...manual, machine: event.target.value })} />
                  <Input className="rounded-xl w-full" placeholder="Note" value={manual.note} onChange={(event) => setManual({ ...manual, note: event.target.value })} />
                </div>
                <Button className="w-full rounded-2xl mt-3 h-11 font-semibold" onClick={addOrUpdateJob}>{editingId ? "Save changes" : `Add to ${active.label}`}</Button>
                {editingId ? <Button variant="ghost" className="w-full rounded-2xl mt-2 h-10" onClick={resetForm}>Cancel edit</Button> : null}
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm border-slate-200 bg-white">
              <CardContent className="p-3">
                <h3 className="font-bold text-lg text-slate-950">History / audit</h3>
                <div className="mt-3 text-sm text-slate-700 space-y-2">
                  <div>Done: job turns green and disappears from the Open filter.</div>
                  <div>START / DONE / PROBLEM: active button can be clicked again to return the job to Ready.</div>
                  <div>P1: yellow card, can be switched on/off and automatically moves to the top.</div>
                  <div>Done jobs older than 7 days are hidden from the working queue automatically.</div>
                  <div>Current version stores data in this browser via localStorage.</div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm border-slate-200 bg-white">
              <CardContent className="p-3">
                <h3 className="font-bold text-lg text-slate-950">Test scenarios</h3>
                <p className="text-sm text-slate-500 mt-1">Adds test jobs to verify counters, green DONE status, yellow P1 priority, filters, hiding of done jobs older than 7 days and refresh persistence.</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button variant="outline" className="rounded-xl h-10" onClick={addTestJobs}>Add test</Button>
                  <Button variant="outline" className="rounded-xl h-10" onClick={clearAllJobs}>Clear</Button>
                </div>
                <Button variant="outline" className="w-full rounded-xl mt-2 h-10" onClick={exportVisibleQueueToCsv}>Export current queue</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
