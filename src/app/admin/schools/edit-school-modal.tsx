"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Loader2, Plus, Trash2 } from "lucide-react";

interface School {
  id: string;
  name: string;
  state: string | null;
  district: string | null;
  board: string;
}

interface SchoolModalProps {
  school?: School; // If provided, we are in Edit mode. If absent, Create mode.
  onSuccess?: () => void;
}

export function SchoolModal({ school, onSuccess }: SchoolModalProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: school?.name || "",
    state: school?.state || "",
    district: school?.district || "",
    board: school?.board || "CBSE",
  });

  const isEdit = !!school;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("School name is required");
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/schools/${school.id}` : "/api/admin/schools";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setOpen(false);
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save school");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!school) return;
    if (
      !confirm(
        `Are you sure you want to delete ${school.name}? This will remove all associated exam patterns and documents. This action CANNOT be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/schools/${school.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setOpen(false);
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete school");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all">
            <Plus className="h-4 w-4" />
            Register School
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-bold">
            {isEdit ? "Edit Registered School" : "Register New School"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="school-name" className="text-sm font-semibold">School Name *</Label>
            <Input
              id="school-name"
              placeholder="e.g. Vydehi School of Excellence"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="school-state" className="text-sm font-semibold">State</Label>
              <Input
                id="school-state"
                placeholder="e.g. Karnataka"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="school-district" className="text-sm font-semibold">District</Label>
              <Input
                id="school-district"
                placeholder="e.g. Bengaluru"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="school-board" className="text-sm font-semibold">Educational Board</Label>
            <select
              id="school-board"
              value={form.board}
              onChange={(e) => setForm({ ...form, board: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="CBSE">CBSE (Central Board of Secondary Education)</option>
              <option value="ICSE">ICSE (Indian Certificate of Secondary Education)</option>
              <option value="STATE">State Board</option>
              <option value="IB">IB (International Baccalaureate)</option>
            </select>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-2"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete School
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving || deleting}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || deleting} className="bg-primary text-primary-foreground font-medium">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Register School"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
