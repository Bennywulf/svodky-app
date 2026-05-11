import React, { useEffect, useMemo, useState } from "react";

function Button({ className = "", children, variant = "default", ...props }) {
  const styles =
    variant === "outline"
      ? "bg-white text-slate-900 border border-slate-300"
      : "bg-slate-900 text-white border border-slate-900";

  return (
    <button
      className={`${styles} ${className} inline-flex items-center justify-center transition`}
      {...props}
    >
      {children}
    </button>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`border border-slate-300 bg-white px-3 py-2 rounded-xl outline-none ${className}`}
      {...props}
    />
  );
}

const queues = [
  { key: "O", label: "HALL O" },
  { key: "P", label: "HALL P" },
  { key: "L", label: "HALL L" },
];

export default function App() {
  const [jobs, setJobs] = useState(() => {
    try {
      const saved = localStorage.getItem("svodky-jobs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("svodky-jobs", JSON.stringify(jobs));
  }, [jobs]);

  const emptyForm = {
    order: "ZR26-",
    client: "",
    job: "",
    thickness: "",
    minutes: "",
    deadline: "",
    machine: "",
    note: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [activeQueue, setActiveQueue] = useState("O");
  const [showDone, setShowDone] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const visibleJobs = useMemo(() => {
    return jobs
      .filter((j) => j.queue === activeQueue)
      .filter((j) => (showDone ? true : j.status !== "DONE"))
      .sort((a, b) => {
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;
        return 0;
      });
  }, [jobs, activeQueue, showDone]);

  function saveJob() {
    if (!form.order || !form.client || !form.job) return;

    if (editingId) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === editingId
            ? {
                ...j,
                ...form,
              }
            : j
        )
      );

      setEditingId(null);
      setForm(emptyForm);
      return;
    }

    const newJob = {
      id: Date.now(),
      queue: activeQueue,
      ...form,
      status: "READY",
      priority: false,
    };

    setJobs((prev) => [...prev, newJob]);
    setForm(emptyForm);
  }

  function editJob(job) {
    setEditingId(job.id);
    setForm({
      order: job.order,
      client: job.client,
      job: job.job,
      thickness: job.thickness,
      minutes: job.minutes,
      deadline: job.deadline || "",
      machine: job.machine || "",
      note: job.note || "",
    });
  }

  function toggleStatus(id, status) {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== id) return job;

        return {
          ...job,
          status: job.status === status ? "READY" : status,
        };
      })
    );
  }

  function togglePriority(id) {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== id) return job;

        return {
          ...job,
          priority: !job.priority,
        };
      })
    );
  }

  function exportCsv() {
    const rows = [
      ["Order", "Client", "Job", "Thickness", "Minutes", "Deadline", "Machine", "Status"],
      ...visibleJobs.map((j) => [
        j.order,
        j.client,
        j.job,
        j.thickness,
        j.minutes,
        j.deadline,
        j.machine,
        j.status,
      ]),
    ];

    const csv = rows.map((r) => r.join(";")).join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "svodky.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">SVODKY</h1>
            <p className="text-slate-600">Cuius Regio Eius Religio</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-2xl h-11 min-w-[180px] px-5 font-semibold"
              onClick={exportCsv}
            >
              Export queue
            </Button>

            <Button className="rounded-2xl h-11 min-w-[180px] px-5 font-semibold">
              + Add job manually
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {queues.map((queue) => {
            const queueJobs = jobs.filter((j) => j.queue === queue.key);
            const totalMinutes = queueJobs.reduce(
              (sum, job) => sum + (Number(job.minutes) || 0),
              0
            );

            return (
              <button
                key={queue.key}
                onClick={() => setActiveQueue(queue.key)}
                className={`rounded-2xl p-4 text-left border shadow-sm transition ${
                  activeQueue === queue.key
                    ? "bg-slate-900 text-white"
                    : "bg-white"
                }`}
              >
                <div className="font-bold text-lg">{queue.label}</div>
                <div className="text-sm mt-2">{queueJobs.length} jobs</div>
                <div className="text-xs mt-1">{totalMinutes} min</div>
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-wrap gap-2 items-center justify-between">
              <div className="font-bold text-lg">Queue</div>

              <div className="flex gap-2">
                <Button
                  className="rounded-2xl h-11 min-w-[120px] px-5 font-semibold"
                  variant={showDone ? "outline" : "default"}
                  onClick={() => setShowDone(false)}
                >
                  Open
                </Button>

                <Button
                  className="rounded-2xl h-11 min-w-[120px] px-5 font-semibold"
                  variant={showDone ? "default" : "outline"}
                  onClick={() => setShowDone(true)}
                >
                  All
                </Button>
              </div>
            </div>

            {visibleJobs.map((job) => (
              <div
                key={job.id}
                className={`rounded-2xl border shadow-sm p-4 ${
                  job.status === "DONE"
                    ? "bg-green-100 border-green-300"
                    : job.priority
                    ? "bg-yellow-100 border-yellow-300"
                    : "bg-white"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="font-bold">{job.order}</div>
                    <div className="text-sm text-slate-600">
                      {job.client} - {job.job}
                    </div>
                  </div>

                  <div className="text-sm font-semibold">
                    {job.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div>Thickness: {job.thickness}</div>
                  <div>Minutes: {job.minutes}</div>
                  <div>Deadline: {job.deadline}</div>
                  <div>Machine: {job.machine}</div>
                </div>

                {job.note ? (
                  <div className="mt-3 text-sm bg-slate-100 rounded-xl p-2">
                    {job.note}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button
                    className="rounded-xl text-sm px-4 h-10 w-full font-semibold"
                    variant={job.status === "START" ? "default" : "outline"}
                    onClick={() => toggleStatus(job.id, "START")}
                  >
                    START
                  </Button>

                  <Button
                    className="rounded-xl text-sm px-4 h-10 w-full font-semibold"
                    variant={job.status === "DONE" ? "default" : "outline"}
                    onClick={() => toggleStatus(job.id, "DONE")}
                  >
                    DONE
                  </Button>

                  <Button
                    className="rounded-xl text-sm px-4 h-10 w-full font-semibold"
                    variant={job.status === "PROBLEM" ? "default" : "outline"}
                    onClick={() => toggleStatus(job.id, "PROBLEM")}
                  >
                    PROBLEM
                  </Button>

                  <Button
                    className="rounded-xl text-sm px-4 h-10 w-full font-semibold"
                    variant={job.priority ? "default" : "outline"}
                    onClick={() => togglePriority(job.id)}
                  >
                    P1
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="rounded-xl h-9 px-4 mt-3 text-sm"
                  onClick={() => editJob(job)}
                >
                  Edit
                </Button>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3 h-fit">
            <div className="font-bold text-lg">
              {editingId ? "Edit job" : "Add job"}
            </div>

            <Input
              value={form.order}
              onChange={(e) =>
                setForm({ ...form, order: e.target.value })
              }
              placeholder="Order"
            />

            <Input
              value={form.client}
              onChange={(e) =>
                setForm({ ...form, client: e.target.value })
              }
              placeholder="Client"
            />

            <Input
              value={form.job}
              onChange={(e) =>
                setForm({ ...form, job: e.target.value })
              }
              placeholder="Job number"
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                value={form.thickness}
                onChange={(e) =>
                  setForm({ ...form, thickness: e.target.value })
                }
                placeholder="Thickness"
              />

              <Input
                value={form.minutes}
                onChange={(e) =>
                  setForm({ ...form, minutes: e.target.value })
                }
                placeholder="Minutes"
              />
            </div>

            <Input
              value={form.deadline}
              onChange={(e) =>
                setForm({ ...form, deadline: e.target.value })
              }
              placeholder="Deadline"
            />

            <Input
              value={form.machine}
              onChange={(e) =>
                setForm({ ...form, machine: e.target.value })
              }
              placeholder="Machine"
            />

            <Input
              value={form.note}
              onChange={(e) =>
                setForm({ ...form, note: e.target.value })
              }
              placeholder="Note"
            />

            <Button
              className="rounded-2xl h-11 w-full font-semibold"
              onClick={saveJob}
            >
              {editingId ? "Save changes" : "Add job"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
