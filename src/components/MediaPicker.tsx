import { useState, useEffect } from 'react';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Smile, Image as ImageIcon, Send } from 'lucide-react';

interface MediaPickerProps {
  onEmojiClick: (emojiData: any) => void;
  onGifSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export default function MediaPicker({ onEmojiClick, onGifSelect, onClose }: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'gif' | 'sticker'>('emoji');
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [stickers, setStickers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Giphy API configuration
  const GIPHY_API_KEY = 'LIV09pGfODSBr6fI1RAd94F8r6k58x0f';

  useEffect(() => {
    if (activeTab === 'gif' && gifSearch.trim() === '') {
      fetchTrendingMedia('gifs');
    } else if (activeTab === 'sticker' && gifSearch.trim() === '') {
      fetchTrendingMedia('stickers');
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (gifSearch.trim()) {
        searchMedia(activeTab === 'sticker' ? 'stickers' : 'gifs');
      } else {
        fetchTrendingMedia(activeTab === 'sticker' ? 'stickers' : 'gifs');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [gifSearch, activeTab]);

  const fetchTrendingMedia = async (type: 'gifs' | 'stickers') => {
    setLoading(true);
    try {
      const response = await fetch(`https://api.giphy.com/v1/${type}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`);
      const data = await response.json();
      if (type === 'gifs') setGifs(data.data || []);
      else setStickers(data.data || []);
    } catch (error) {
      console.error(`Error fetching trending ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const searchMedia = async (type: 'gifs' | 'stickers') => {
    setLoading(true);
    try {
      const response = await fetch(`https://api.giphy.com/v1/${type}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(gifSearch)}&limit=20&rating=g`);
      const data = await response.json();
      if (type === 'gifs') setGifs(data.data || []);
      else setStickers(data.data || []);
    } catch (error) {
      console.error(`Error searching ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#233138] flex flex-col h-full w-full">
      <div className="flex border-b border-[#2a3942] flex-shrink-0">
        <button 
          onClick={() => setActiveTab('emoji')}
          className={`flex-1 flex items-center justify-center py-4 gap-2 transition-all ${activeTab === 'emoji' ? 'text-[#00a884] border-b-2 border-[#00a884]' : 'text-[#8696a0]'}`}
        >
          <Smile className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Emoji</span>
        </button>
        <button 
          onClick={() => setActiveTab('gif')}
          className={`flex-1 flex items-center justify-center py-4 gap-2 transition-all ${activeTab === 'gif' ? 'text-[#00a884] border-b-2 border-[#00a884]' : 'text-[#8696a0]'}`}
        >
          <ImageIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">GIFs</span>
        </button>
        <button 
          onClick={() => setActiveTab('sticker')}
          className={`flex-1 flex items-center justify-center py-4 gap-2 transition-all ${activeTab === 'sticker' ? 'text-[#00a884] border-b-2 border-[#00a884]' : 'text-[#8696a0]'}`}
        >
          <div className="w-5 h-5 border-2 border-current rounded-sm rotate-12 flex items-center justify-center text-[10px] font-bold">S</div>
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Stickers</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative">
        {activeTab === 'emoji' ? (
          <div className="flex-1 emoji-picker-container">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme={Theme.DARK}
              emojiStyle={EmojiStyle.NATIVE}
              width="100%"
              height="100%"
              lazyLoadEmojis={true}
              searchPlaceHolder="Pesquisar emoji..."
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="relative mb-4 flex-shrink-0">
              <input 
                type="text"
                placeholder={activeTab === 'gif' ? "Pesquisar no Giphy..." : "Pesquisar stickers..."}
                value={gifSearch}
                onChange={(e) => setGifSearch(e.target.value)}
                className="w-full bg-[#2a3942] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#e9edef] focus:ring-1 focus:ring-[#00a884] placeholder:opacity-50"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8696a0]" />
              {gifSearch && (
                <button 
                  onClick={() => setGifSearch('')}
                  className="absolute right-3 top-2.5"
                >
                  <X className="w-4 h-4 text-[#8696a0] hover:text-white" />
                </button>
              )}
            </div>

            <div className={`flex-1 overflow-y-auto grid ${activeTab === 'gif' ? 'grid-cols-2' : 'grid-cols-3'} gap-2 content-start pb-4 custom-scrollbar`}>
              {loading ? (
                <div className="col-span-full flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                (activeTab === 'gif' ? gifs : stickers).map((item, i) => (
                  <button 
                    key={item.id || i}
                    onClick={() => onGifSelect(item.images.fixed_height.url)}
                    className={`relative ${activeTab === 'gif' ? 'aspect-video' : 'aspect-square p-2'} bg-[#2a3942] rounded-lg overflow-hidden group hover:scale-[1.02] transition-transform`}
                  >
                    <img 
                      src={item.images.fixed_height.url} 
                      alt={item.title || 'Media'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))
              )}
              {!loading && (activeTab === 'gif' ? gifs : stickers).length === 0 && (
                <div className="col-span-full text-center py-10 text-[#8696a0] text-sm italic">
                  Nenhum resultado encontrado.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    <style dangerouslySetInnerHTML={{ __html: `
        .emoji-picker-container .epr-body::-webkit-scrollbar {
          width: 6px;
        }
        .emoji-picker-container .epr-body::-webkit-scrollbar-thumb {
          background: #3b4a54;
          border-radius: 10px;
        }
        .EmojiPickerReact {
          --epr-bg-color: #233138 !important;
          --epr-category-label-bg-color: #233138 !important;
          --epr-picker-border-color: transparent !important;
          border: none !important;
          --epr-header-padding: 12px !important;
          --epr-emoji-padding: 8px !important;
        }
        .epr-search {
          background-color: #2a3942 !important;
          border: none !important;
          color: white !important;
        }
      `}} />
    </div>
  );
}
