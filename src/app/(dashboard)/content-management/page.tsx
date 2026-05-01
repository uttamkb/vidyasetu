"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Play,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  BookOpen,
  Video,
  FileText,
  Search,
  Filter,
  TrendingUp,
  AlertCircle,
  Eye,
  ExternalLink,
  Trash2,
  Plus,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  url: string;
  type: string;
  relevanceScore: number;
  isApproved: boolean;
  isAutoApproved: boolean;
  fetchedAt: string;
  publishedAt: string | null;
  rejectionReason: string | null;
  source: {
    id: string;
    name: string;
  };
  subject: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface Source {
  id: string;
  name: string;
  url: string;
  type: string;
  isActive: boolean;
  lastFetched: string | null;
  subject: {
    id: string;
    name: string;
    color: string;
  } | null;
  _count: {
    items: number;
  };
}

interface AgentStatus {
  isRunning: boolean;
  config: {
    enabled: boolean;
    interval: number;
    autoApproveThreshold: number;
    minRelevanceScore: number;
  };
  currentRunId: string | null;
}

interface AgentRun {
  id: string;
  status: string;
  itemsFound: number;
  itemsApproved: number;
  itemsRejected: number;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

export default function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState("queue");
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [contentQueue, setContentQueue] = useState<ContentItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAgentStatus = async () => {
    try {
      const response = await fetch("/api/content/agent");
      const data = await response.json();
      if (data.success) {
        setAgentStatus(data.data.status);
        setRecentRuns(data.data.recentRuns || []);
      }
    } catch (error) {
      console.error("Error fetching agent status:", error);
    }
  };

  const fetchContentQueue = async () => {
    try {
      const response = await fetch("/api/content/queue?status=PENDING");
      const data = await response.json();
      if (data.success) {
        setContentQueue(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching content queue:", error);
    }
  };

  const fetchSources = async () => {
    try {
      const response = await fetch("/api/content/sources");
      const data = await response.json();
      if (data.success) {
        setSources(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  };

  useEffect(() => {
    fetchAgentStatus();
    fetchContentQueue();
    fetchSources();
    const interval = setInterval(() => {
      fetchAgentStatus();
      fetchContentQueue();
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, [fetchAgentStatus, fetchContentQueue, fetchSources]);

  const handleAgentAction = async (action: "start" | "stop" | "trigger") => {
    setLoading(true);
    try {
      const response = await fetch("/api/content/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (data.success) {
        fetchAgentStatus();
      }
    } catch (error) {
      console.error(`Error ${action}ing agent:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveContent = async (contentId: string) => {
    try {
      const response = await fetch("/api/content/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, action: "approve" }),
      });
      const data = await response.json();
      if (data.success) {
        fetchContentQueue();
      }
    } catch (error) {
      console.error("Error approving content:", error);
    }
  };

  const handleRejectContent = async () => {
    if (!selectedContent || !rejectionReason.trim()) return;
    
    try {
      const response = await fetch("/api/content/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: selectedContent.id,
          action: "reject",
          reason: rejectionReason,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchContentQueue();
        setShowRejectDialog(false);
        setRejectionReason("");
        setSelectedContent(null);
      }
    } catch (error) {
      console.error("Error rejecting content:", error);
    }
  };

  const filteredContent = contentQueue.filter((item) => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "VIDEO": return <Video className="h-4 w-4" />;
      case "PDF": return <FileText className="h-4 w-4" />;
      case "INTERACTIVE": return <Activity className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "VIDEO": return "bg-red-100 text-red-800";
      case "PDF": return "bg-green-100 text-green-800";
      case "INTERACTIVE": return "bg-purple-100 text-purple-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
          <p className="text-muted-foreground">
            Manage automated content aggregation and curation
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowAddSourceDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </div>

      {/* Agent Status Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-blue-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Content Agent Status
              </CardTitle>
              <CardDescription>
                {agentStatus?.isRunning ? "Agent is currently running" : "Agent is stopped"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {agentStatus?.isRunning ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAgentAction("trigger")}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Trigger Run
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAgentAction("stop")}
                    disabled={loading}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleAgentAction("start")}
                  disabled={loading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Agent
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Globe className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sources.length}</p>
                <p className="text-xs text-muted-foreground">Active Sources</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contentQueue.length}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {recentRuns.length > 0 ? recentRuns[0].itemsApproved : 0}
                </p>
                <p className="text-xs text-muted-foreground">Last Run Approved</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {agentStatus?.config.autoApproveThreshold || 0.8}
                </p>
                <p className="text-xs text-muted-foreground">Auto-Approve Threshold</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="queue">
            <Clock className="h-4 w-4 mr-2" />
            Pending Review ({contentQueue.length})
          </TabsTrigger>
          <TabsTrigger value="sources">
            <Globe className="h-4 w-4 mr-2" />
            Sources ({sources.length})
          </TabsTrigger>
          <TabsTrigger value="runs">
            <Activity className="h-4 w-4 mr-2" />
            Recent Runs
          </TabsTrigger>
        </TabsList>

        {/* Pending Content Queue */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ARTICLE">Articles</SelectItem>
                <SelectItem value="VIDEO">Videos</SelectItem>
                <SelectItem value="PDF">PDFs</SelectItem>
                <SelectItem value="INTERACTIVE">Interactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredContent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">
                  No content pending review. The agent will notify you when new content is found.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredContent.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge className={getTypeColor(item.type)}>
                        {getTypeIcon(item.type)}
                        <span className="ml-1">{item.type}</span>
                      </Badge>
                      <div className={`text-sm font-semibold ${getScoreColor(item.relevanceScore)}`}>
                        {(item.relevanceScore * 100).toFixed(0)}%
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2 line-clamp-2">{item.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${item.subject?.color || 'bg-gray-400'}`} />
                      <span className="text-muted-foreground">
                        {item.subject?.name || "General"}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {item.source.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Fetched {formatDistanceToNow(new Date(item.fetchedAt), { addSuffix: true })}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(item.url, "_blank")}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleApproveContent(item.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedContent(item);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {sources.map((source) => (
              <Card key={source.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{source.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate">{source.url}</span>
                      </CardDescription>
                    </div>
                    <Badge variant={source.isActive ? "default" : "secondary"}>
                      {source.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium">{source.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Subject</p>
                      <p className="font-medium">{source.subject?.name || "All"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Items Found</p>
                      <p className="font-medium">{source._count.items}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Fetched</p>
                      <p className="font-medium">
                        {source.lastFetched
                          ? formatDistanceToNow(new Date(source.lastFetched), { addSuffix: true })
                          : "Never"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recent Runs Tab */}
        <TabsContent value="runs" className="space-y-4">
          {recentRuns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Runs Yet</h3>
                <p className="text-muted-foreground">
                  Start the agent to begin content aggregation cycles.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <Card key={run.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          run.status === "COMPLETED" ? "bg-green-100" :
                          run.status === "FAILED" ? "bg-red-100" : "bg-blue-100"
                        }`}>
                          {run.status === "COMPLETED" ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : run.status === "FAILED" ? (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            Run {run.id.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{run.itemsFound}</p>
                          <p className="text-xs text-muted-foreground">Found</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{run.itemsApproved}</p>
                          <p className="text-xs text-muted-foreground">Approved</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{run.itemsRejected}</p>
                          <p className="text-xs text-muted-foreground">Rejected</p>
                        </div>
                      </div>
                    </div>
                    {run.error && (
                      <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                        {run.error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Content</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this content. This will help improve future content selection.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., Not relevant to CBSE Class 9 curriculum..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectContent}
              disabled={!rejectionReason.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Source Dialog */}
      <Dialog open={showAddSourceDialog} onOpenChange={setShowAddSourceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Content Source</DialogTitle>
            <DialogDescription>
              Add a new source for the content agent to monitor. Ensure it's a trusted educational website.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Source Name</label>
                <Input placeholder="e.g., Khan Academy Math" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Source Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RSS">RSS Feed</SelectItem>
                    <SelectItem value="WEBSITE">Website</SelectItem>
                    <SelectItem value="YOUTUBE">YouTube Channel</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL</label>
              <Input placeholder="https://example.com/feed" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject (Optional)</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="math">Mathematics</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="sst">Social Science</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSourceDialog(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}