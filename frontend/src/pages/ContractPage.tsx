import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ContractMeta } from "../api";
import EventTable from "../components/EventTable";
import Skeleton from "../components/Skeleton";
import CopyButton from "../components/CopyButton";

export default function ContractPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();

  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => api.contract(id),
    enabled: !!id,
  });

  const { data: eventsData, isLoading: evLoading } = useQuery({
    queryKey: ["events", id],
    queryFn: () => api.events({ contract: id }),
    // Wait until the contract metadata fetch has settled before querying events.
    // Without !metaLoading, a dangling request fires during the brief window
    // where meta is still undefined (before the fetch returns null for an
    // unregistered contract), causing the query to hang in a pending state.
    enabled: !!id && !metaLoading && !!meta,
  });
  const events = eventsData?.events ?? [];
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  const registerMutation = useMutation({
    mutationFn: api.registerContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", id] });
    },
  });

  if (metaLoading) return <div className="card"><Skeleton rows={3} /></div>;

  if (!meta) {
    return <RegistrationForm id={id} registerMutation={registerMutation} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>{meta.name}</h2>
        <p style={{ color: "var(--muted)", marginBottom: 12 }}>{meta.description}</p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <code style={{ fontSize: 12, color: "var(--muted)", wordBreak: "break-all", flex: 1 }}>{id}</code>
          <CopyButton value={id} size="small" ariaLabel="Copy contract ID" />
        </div>
        {meta.registered_by && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            Registered by <code style={{ fontFamily: "monospace" }}>{meta.registered_by}</code>
          </div>
        )}
        {meta.created_at && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            Created on {new Date(meta.created_at).toUTCString()}
          </div>
        )}

        {meta.functions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 8, fontSize: 14 }}>Functions</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {meta.functions.map(f => (
                <Link 
                  key={f.name} 
                  to={`/?contract=${id}&fn=${f.name}`}
                  style={{ textDecoration: "none" }}
                >
                  <div className="card" style={{ padding: "8px 12px", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.backgroundColor = "var(--border)";
                  }} onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.backgroundColor = "";
                  }}>
                    <span className="badge">{f.name}</span>
                    <span style={{ marginLeft: 8, color: "var(--muted)" }}>{f.description}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Update metadata button: triggers cache invalidation so updated metadata
            is reflected immediately rather than waiting for staleTime to expire. */}
        {!confirmUpdate ? (
          <button
            style={{ marginTop: 16 }}
            disabled={registerMutation.isPending}
            onClick={() => setConfirmUpdate(true)}
          >
            {registerMutation.isPending ? "Saving…" : "Update metadata"}
          </button>
        ) : (
          <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
            <span>Update contract metadata?</span>
            <button
              disabled={registerMutation.isPending}
              onClick={() => {
                registerMutation.mutate(meta);
                setConfirmUpdate(false);
              }}
            >
              {registerMutation.isPending ? "Saving…" : "Confirm"}
            </button>
            <button
              disabled={registerMutation.isPending}
              onClick={() => setConfirmUpdate(false)}
            >
              Cancel
            </button>
          </div>
        )}
        {registerMutation.isError && (
          <p style={{ color: "red", marginTop: 8 }}>
            {(registerMutation.error as Error).message}
          </p>
        )}
        {registerMutation.isSuccess && (
          <p style={{ color: "green", marginTop: 8 }}>Metadata updated.</p>
        )}
      </div>

      <h3>Recent Events</h3>
      <div className="card">
        {evLoading ? <Skeleton variant="table" /> : <EventTable events={events} />}
      </div>
    </div>
  );
}

function RegistrationForm({
  id,
  registerMutation,
}: {
  id: string;
  registerMutation: ReturnType<typeof useMutation<any, any, ContractMeta, any>>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [functions, setFunctions] = useState<{ name: string; description: string }[]>([]);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const addFunction = () => {
    setFunctions((prev) => [...prev, { name: "", description: "" }]);
  };

  const updateFunction = (index: number, field: "name" | "description", value: string) => {
    setFunctions((prev) =>
      prev.map((fn, i) => (i === index ? { ...fn, [field]: value } : fn))
    );
  };

  const removeFunction = (index: number) => {
    setFunctions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string } = {};
    if (!name.trim()) newErrors.name = "Name is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    registerMutation.mutate({
      id,
      name: name.trim(),
      description: description.trim(),
      functions: functions.filter((fn) => fn.name.trim() !== ""),
    });
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: 8 }}>Register Contract</h2>
      <p style={{ color: "var(--muted)", marginBottom: 16 }}>
        This contract is not yet registered. Fill in the form below to register it.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>
            Contract ID
          </label>
          <code style={{ fontSize: 12, color: "var(--muted)", wordBreak: "break-all" }}>{id}</code>
        </div>

        <div>
          <label htmlFor="reg-name" style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>
            Name *
          </label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Token Contract"
            style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--fg)" }}
          />
          {errors.name && <p style={{ color: "red", marginTop: 4, fontSize: 13 }}>{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="reg-desc" style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>
            Description
          </label>
          <textarea
            id="reg-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this contract does"
            rows={3}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--fg)", resize: "vertical" }}
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 600 }}>Functions</label>
            <button type="button" onClick={addFunction} style={{ fontSize: 13, padding: "4px 10px" }}>
              + Add function
            </button>
          </div>
          {functions.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>No functions added yet.</p>
          )}
          {functions.map((fn, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                value={fn.name}
                onChange={(e) => updateFunction(i, "name", e.target.value)}
                placeholder="Function name"
                style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--fg)" }}
              />
              <input
                type="text"
                value={fn.description}
                onChange={(e) => updateFunction(i, "description", e.target.value)}
                placeholder="Description"
                style={{ flex: 2, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--fg)" }}
              />
              <button type="button" onClick={() => removeFunction(i)} style={{ padding: "6px 10px" }}>
                Remove
              </button>
            </div>
          ))}
        </div>

        <button type="submit" disabled={registerMutation.isPending} style={{ alignSelf: "flex-start" }}>
          {registerMutation.isPending ? "Registering…" : "Register contract"}
        </button>

        {registerMutation.isError && (
          <p style={{ color: "red", fontSize: 13 }}>
            {(registerMutation.error as Error).message}
          </p>
        )}
      </form>
    </div>
  );
}
