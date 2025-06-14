
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious
} from "@/components/ui/pagination";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Note } from "@/lib/types";
import ImageUpload from "./ImageUpload";
import { Edit, Trash2, Search, Calendar as CalendarIcon, User, MessageSquare, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const ITEMS_PER_PAGE = 5;

const NoteForm: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  
  const { user } = useAuth();
  
  useEffect(() => {
    fetchNotes();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('public:notes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notes' 
      }, () => {
        fetchNotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Live search and filtering
  useEffect(() => {
    let filtered = [...notes];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.content.toLowerCase().includes(query) ||
        note.author_name.toLowerCase().includes(query)
      );
    }
    
    // Date filter
    if (selectedDate) {
      const targetDate = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter(note => {
        const noteDate = format(new Date(note.created_at), 'yyyy-MM-dd');
        return noteDate === targetDate;
      });
    }
    
    // Author filter
    if (authorFilter !== "all") {
      filtered = filtered.filter(note => note.author_name === authorFilter);
    }
    
    setFilteredNotes(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [notes, searchQuery, selectedDate, authorFilter]);
  
  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Gagal memuat catatan');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Catatan tidak boleh kosong');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (editingNote) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({ 
            content,
            author_name: authorName || 'Anonim',
            image_url: imageUrl || null
          })
          .eq('id', editingNote.id);
          
        if (error) throw error;
        toast.success('Catatan berhasil diperbarui');
        setEditingNote(null);
      } else {
        // Create new note
        const { error } = await supabase
          .from('notes')
          .insert([{ 
            content,
            author_name: authorName || 'Anonim',
            user_id: user?.id,
            image_url: imageUrl || null
          }]);
          
        if (error) throw error;
        toast.success('Catatan berhasil ditambahkan');
      }
      
      setContent("");
      setImageUrl("");
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Gagal menyimpan catatan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setContent(note.content);
    setAuthorName(note.author_name);
    setImageUrl(note.image_url || "");
  };

  const handleDelete = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);
        
      if (error) throw error;
      toast.success('Catatan berhasil dihapus');
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Gagal menghapus catatan');
    }
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setContent("");
    setImageUrl("");
  };

  const handleImageUploaded = (url: string) => {
    setImageUrl(url);
  };

  const handleImageRemoved = () => {
    setImageUrl("");
  };
  
  // Get unique authors for filter
  const uniqueAuthors = Array.from(new Set(notes.map(note => note.author_name)));
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredNotes.length / ITEMS_PER_PAGE);
  
  // Get current page items
  const currentNotes = filteredNotes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', { 
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold">
              <MessageSquare className="h-8 w-8" />
              Forum Catatan
              <Sparkles className="h-6 w-6 animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-8">
              {/* Form untuk menambahkan/edit catatan */}
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-6 rounded-xl border border-purple-200 shadow-lg animate-fade-in">
                <h3 className="text-lg font-semibold mb-4 text-purple-800 flex items-center gap-2">
                  {editingNote ? <Edit className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                  {editingNote ? 'Edit Catatan' : 'Tulis Catatan Baru'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <Input
                      placeholder="Nama Anda (opsional)"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-3">
                        <Textarea
                          placeholder="Tuliskan catatan anda disini..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="min-h-[100px] border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                        <ImageUpload
                          onImageUploaded={handleImageUploaded}
                          onImageRemoved={handleImageRemoved}
                          currentImageUrl={imageUrl}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          type="submit" 
                          disabled={isLoading}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          {isLoading ? "Menyimpan..." : editingNote ? "Update" : "Kirim"}
                        </Button>
                        {editingNote && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={cancelEdit}
                            className="border-purple-300 text-purple-600 hover:bg-purple-50"
                          >
                            Batal
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              
              {/* Filter Section */}
              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-6 rounded-xl border border-blue-200 shadow-lg animate-slide-in">
                <h3 className="text-lg font-semibold mb-4 text-blue-800 flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Filter & Pencarian
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Live Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Cari catatan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Date Filter */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal border-blue-300 hover:bg-blue-50"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* Author Filter */}
                  <Select value={authorFilter} onValueChange={setAuthorFilter}>
                    <SelectTrigger className="border-blue-300 focus:border-blue-500 focus:ring-blue-500">
                      <User className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by author" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Penulis</SelectItem>
                      {uniqueAuthors.map((author) => (
                        <SelectItem key={author} value={author}>
                          {author}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Clear Filters */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedDate(undefined);
                      setAuthorFilter("all");
                    }}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
              
              {/* Results Summary */}
              {(searchQuery || selectedDate || authorFilter !== "all") && (
                <div className="text-center p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border border-green-200 animate-scale-in">
                  <p className="text-green-800 font-medium">
                    Menampilkan {filteredNotes.length} dari {notes.length} catatan
                  </p>
                </div>
              )}
              
              {/* Daftar catatan */}
              <div className="space-y-6">
                {currentNotes.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-r from-gray-100 to-slate-100 rounded-xl border border-gray-200 animate-fade-in">
                    <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">
                      {notes.length === 0 ? "Belum ada catatan" : "Tidak ada catatan yang sesuai dengan filter"}
                    </p>
                  </div>
                ) : (
                  currentNotes.map((note, index) => (
                    <div 
                      key={note.id} 
                      className="group relative bg-gradient-to-r from-white to-purple-50 p-6 rounded-xl border border-purple-200 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {/* Decorative Elements */}
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500 rounded-l-xl"></div>
                      <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles className="h-8 w-8 text-purple-500" />
                      </div>
                      
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <span className="font-semibold text-purple-800">{note.author_name}</span>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {formatDate(note.created_at)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(note)}
                            className="border-blue-300 text-blue-600 hover:bg-blue-50 hover:scale-105 transition-all"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-300 text-red-600 hover:bg-red-50 hover:scale-105 transition-all"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Catatan</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(note.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      <div className="bg-white/50 p-4 rounded-lg border border-purple-100 mb-4">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                      </div>
                      
                      {note.image_url && (
                        <div className="mt-4">
                          <img
                            src={note.image_url}
                            alt="Gambar catatan"
                            className="max-w-full h-auto max-h-64 object-cover rounded-lg border border-purple-200 shadow-md cursor-pointer hover:scale-105 transition-transform duration-300"
                            onClick={() => window.open(note.image_url, '_blank')}
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8 animate-fade-in">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className={`${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-purple-50"} transition-all`}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber: number;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else {
                          const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                          pageNumber = start + i;
                        }
                        
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNumber)}
                              isActive={currentPage === pageNumber}
                              className="hover:bg-purple-50 transition-all hover:scale-105"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className={`${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-purple-50"} transition-all`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NoteForm;
