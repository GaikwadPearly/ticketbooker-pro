import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

export default function Movies() {
  const [user, setUser] = useState<any>(null);
  const [movies, setMovies] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMovies, setFilteredMovies] = useState<any[]>([]);

  useEffect(() => {
    // Get user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Fetch movies
    fetchMovies();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredMovies(
        movies.filter(
          (movie) =>
            movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            movie.genre.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredMovies(movies);
    }
  }, [searchQuery, movies]);

  const fetchMovies = async () => {
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .order("release_date", { ascending: false });

    if (!error && data) {
      setMovies(data);
      setFilteredMovies(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden">
        <img
          src={heroBanner}
          alt="Cinema"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4 p-4">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              Book Your Next
              <span className="block text-primary">Movie Experience</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Choose from the latest blockbusters and timeless classics
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder="Search movies by title or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Movies Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Now Showing</h2>
          {filteredMovies.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  id={movie.id}
                  title={movie.title}
                  genre={movie.genre}
                  rating={movie.rating}
                  duration={movie.duration}
                  posterUrl={movie.poster_url}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No movies found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
