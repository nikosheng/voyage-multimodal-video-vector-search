import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "../lib/api";
import type { Flavor, Prototype } from "../lib/types";

export default function FlavorDetail() {
  const { flavorId } = useParams<{ flavorId: string }>();
  const navigate = useNavigate();
  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [prototypes, setPrototypes] = useState<Prototype[]>([]);
  const [textInput, setTextInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFlavor = () => {
    apiGet<Flavor[]>("/admin/flavors", true).then((flavors) => {
      const found = flavors.find((f) => f.id === flavorId);
      if (found) setFlavor(found);
    });
  };

  const loadPrototypes = () => {
    if (!flavorId) return;
    apiGet<Prototype[]>(`/admin/flavors/${flavorId}/prototypes`, true).then(setPrototypes);
  };

  useEffect(() => {
    loadFlavor();
    loadPrototypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flavorId]);

  const updateField = async (field: Partial<Flavor>) => {
    if (!flavorId) return;
    const updated = await apiPatch<Flavor>(`/admin/flavors/${flavorId}`, field, true);
    setFlavor(updated);
  };

  const handleDeleteFlavor = async () => {
    if (!flavorId || !confirm("確定要刪除呢個口味？相關原型都會一併刪除。")) return;
    await apiDelete(`/admin/flavors/${flavorId}`, true);
    navigate("/admin/flavors");
  };

  const handleAddText = async () => {
    if (!flavorId || !textInput.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(
        `/admin/flavors/${flavorId}/prototypes/text`,
        { text_content: textInput.trim() },
        true,
      );
      setTextInput("");
      loadPrototypes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "新增文字原型失敗");
    } finally {
      setBusy(false);
    }
  };

  const handleUploadVideo = async (file: File) => {
    if (!flavorId) return;
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.append("video", file);
    try {
      await apiUpload(`/admin/flavors/${flavorId}/prototypes/video`, formData, true);
      loadPrototypes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "上傳示範片失敗");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleActive = async (prototypeId: string, isActive: boolean) => {
    await apiPatch(`/admin/prototypes/${prototypeId}?is_active=${!isActive}`, {}, true);
    loadPrototypes();
  };

  const deletePrototype = async (prototypeId: string) => {
    if (!confirm("確定要刪除呢個原型？")) return;
    await apiDelete(`/admin/prototypes/${prototypeId}`, true);
    loadPrototypes();
  };

  if (!flavor) return <p>載入緊...</p>;

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate("/admin/flavors")} className="mb-4 text-slate-400 hover:text-white">
        ← 返回口味列表
      </button>

      <div
        className="mb-8 rounded-2xl border p-6"
        style={{ borderColor: flavor.color_hex, backgroundColor: `${flavor.color_hex}15` }}
      >
        <div className="mb-4 flex items-center gap-4">
          <span className="text-5xl">{flavor.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold">{flavor.name_zh}</h1>
            <p className="text-slate-300">{flavor.taste}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={flavor.is_active}
              onChange={(e) => updateField({ is_active: e.target.checked })}
            />
            啟用中
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={flavor.is_fallback}
              onChange={(e) => updateField({ is_fallback: e.target.checked })}
            />
            Fallback 口味
          </label>
        </div>

        <button
          onClick={handleDeleteFlavor}
          className="mt-4 rounded-lg bg-red-600/80 px-4 py-2 text-sm hover:bg-red-600"
        >
          刪除此口味
        </button>
      </div>

      <h2 className="mb-4 text-xl font-bold">動作原型（Prototypes）</h2>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-slate-900 p-5">
        <p className="text-sm text-slate-400">
          新增文字原型（bootstrap，免錄片）或上傳真實示範片（更準確，會長期存喺 GridFS）。
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="輸入動作描述，例如：一個人凍到喺度震..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <button
            onClick={handleAddText}
            disabled={busy || !textInput.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
          >
            新增文字原型
          </button>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            disabled={busy}
            onChange={(e) => e.target.files?.[0] && handleUploadVideo(e.target.files[0])}
            className="text-sm text-slate-300"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <ul className="space-y-2">
        {prototypes.map((p) => (
          <li
            key={p.id}
            className={`flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 ${
              !p.is_active ? "opacity-50" : ""
            }`}
          >
            <div className="flex-1">
              <span className="mr-2 rounded bg-white/10 px-2 py-0.5 text-xs uppercase">
                {p.modality}
              </span>
              <span className="text-sm">
                {p.modality === "text" ? p.text_content : `影片原型 (${p.source_video_gridfs_id})`}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleActive(p.id, p.is_active)}
                className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
              >
                {p.is_active ? "停用" : "啟用"}
              </button>
              <button
                onClick={() => deletePrototype(p.id)}
                className="rounded-lg bg-red-600/60 px-3 py-1 text-xs hover:bg-red-600"
              >
                刪除
              </button>
            </div>
          </li>
        ))}
        {prototypes.length === 0 && (
          <p className="text-slate-500">仲未有任何原型，請新增文字描述或上傳示範片。</p>
        )}
      </ul>
    </div>
  );
}
