"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserProfileData } from "@/types/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Pencil, Trophy, ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

import { useSession } from "next-auth/react";

export function EditProfileModal({ user }: { user: UserProfileData }) {
  const router = useRouter();
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user.name || "",
    grade: user.grade || "9",
    board: user.board || "CBSE",
    image: user.image || "",
    leaderboardOptIn: user.leaderboardOptIn || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Update local session to sync Navbar name and image
        await update({ 
          name: formData.name,
          image: formData.image,
        });
        
        setOpen(false);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("An error occurred while updating the profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="ml-auto flex items-center justify-center rounded-md border border-input bg-background px-3 h-9 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
        <Pencil className="w-4 h-4 mr-2" />
        Edit Profile
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your student profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              placeholder="e.g., John Doe" 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="grade">Class/Grade</Label>
            <Select 
              value={formData.grade} 
              onValueChange={(value) => setFormData({ ...formData, grade: value })}
            >
              <SelectTrigger id="grade">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">Class 8</SelectItem>
                <SelectItem value="9">Class 9</SelectItem>
                <SelectItem value="10">Class 10</SelectItem>
                <SelectItem value="11">Class 11</SelectItem>
                <SelectItem value="12">Class 12</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="board">Education Board</Label>
            <Select 
              value={formData.board} 
              onValueChange={(value) => setFormData({ ...formData, board: value })}
            >
              <SelectTrigger id="board">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CBSE">CBSE</SelectItem>
                <SelectItem value="ICSE">ICSE</SelectItem>
                <SelectItem value="State Board">State Board</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Profile Picture URL</Label>
            <div className="flex gap-2">
              <Input 
                id="image" 
                value={formData.image} 
                onChange={(e) => setFormData({ ...formData, image: e.target.value })} 
                placeholder="https://example.com/photo.jpg" 
              />
              <div className="flex items-center justify-center w-10 h-10 border rounded-md bg-muted">
                {formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Leaderboard Opt-in
              </Label>
              <p className="text-sm text-muted-foreground">
                Appear in rankings and compete with others.
              </p>
            </div>
            <Switch
              checked={formData.leaderboardOptIn}
              onCheckedChange={(checked) => setFormData({ ...formData, leaderboardOptIn: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
