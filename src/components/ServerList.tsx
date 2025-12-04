import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Star,
  Zap,
  Activity,
  MapPin,
  ChevronRight,
  Globe,
  TrendingUp,
} from "lucide-react";
import { useVPNStore, Server } from "../stores/vpnStore";

// Country flag emoji helper
function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

interface ServerListProps {
  onServerSelect: () => void;
}

export default function ServerList({ onServerSelect }: ServerListProps) {
  const {
    servers,
    selectedServer,
    favoriteServerIds,
    setSelectedServer,
    toggleFavorite,
    status,
    connect,
  } = useVPNStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "favorites" | "recommended">(
    "all"
  );

  // Filter and sort servers
  const filteredServers = useMemo(() => {
    let filtered = servers;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.country.toLowerCase().includes(query) ||
          s.city.toLowerCase().includes(query)
      );
    }

    // Apply tab filter
    if (activeTab === "favorites") {
      filtered = filtered.filter((s) => favoriteServerIds.includes(s.id));
    } else if (activeTab === "recommended") {
      filtered = filtered.filter((s) => s.isRecommended);
    }

    // Sort by latency
    return filtered.sort((a, b) => a.latency - b.latency);
  }, [servers, searchQuery, activeTab, favoriteServerIds]);

  // Group servers by country
  const groupedServers = useMemo(() => {
    const groups: Record<string, Server[]> = {};
    filteredServers.forEach((server) => {
      if (!groups[server.country]) {
        groups[server.country] = [];
      }
      groups[server.country].push(server);
    });
    return groups;
  }, [filteredServers]);

  const handleSelectServer = async (server: Server) => {
    setSelectedServer(server);
    if (status === "disconnected") {
      onServerSelect();
    }
  };

  const handleQuickConnect = async (server: Server) => {
    setSelectedServer(server);
    await connect();
    onServerSelect();
  };

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Server Locations</h1>
        <p className="text-surface-400">
          Choose from {servers.length} servers worldwide
        </p>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search servers..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-800 border border-surface-700 text-white placeholder-surface-400 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-800 rounded-xl p-1">
          {[
            { id: "all", label: "All", icon: Globe },
            { id: "favorites", label: "Favorites", icon: Star },
            { id: "recommended", label: "Best", icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-brand-500 text-white"
                  : "text-surface-400 hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Server List */}
      <div className="flex-1 overflow-auto -mx-2 px-2">
        {Object.entries(groupedServers).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-400">
            <Globe className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No servers found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedServers).map(([country, countryServers]) => (
              <div key={country}>
                {/* Country Header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-xl">
                    {getCountryFlag(countryServers[0].countryCode)}
                  </span>
                  <span className="font-semibold text-white">{country}</span>
                  <span className="text-surface-500 text-sm">
                    ({countryServers.length})
                  </span>
                </div>

                {/* Server Cards */}
                <div className="space-y-2">
                  {countryServers.map((server) => (
                    <ServerCard
                      key={server.id}
                      server={server}
                      isSelected={selectedServer?.id === server.id}
                      isFavorite={favoriteServerIds.includes(server.id)}
                      onSelect={() => handleSelectServer(server)}
                      onToggleFavorite={() => toggleFavorite(server.id)}
                      onQuickConnect={() => handleQuickConnect(server)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ServerCardProps {
  server: Server;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onQuickConnect: () => void;
}

function ServerCard({
  server,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onQuickConnect,
}: ServerCardProps) {
  const loadColor =
    server.load < 50
      ? "text-green-400"
      : server.load < 80
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={`server-card ${isSelected ? "selected" : ""}`}
    >
      <div className="flex items-center gap-4">
        {/* Server Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-surface-400" />
            <span className="font-medium text-white">{server.city}</span>
            {server.isRecommended && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                Recommended
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-sm text-surface-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              {server.latency}ms
            </span>
            <span className={`flex items-center gap-1 ${loadColor}`}>
              <Activity className="w-3.5 h-3.5" />
              {server.load}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-2 rounded-lg transition-colors ${
              isFavorite
                ? "text-yellow-400 bg-yellow-500/10"
                : "text-surface-400 hover:text-yellow-400 hover:bg-surface-700"
            }`}
          >
            <Star className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickConnect();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors text-sm font-medium"
          >
            Connect
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
