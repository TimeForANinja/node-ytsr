declare module 'ytsr' {
  namespace ytsr {
    interface Options {
      safeSearch?: boolean;
      limit?: number;
      nextpageRef?: string;
      hl?: string;
      gl?: string;
      headers?: { [key: string]: string; };
    }

    interface Mix {
      type: 'mix';
      title: string;
      firstItem: string;
      thumbnail: string;
      length: string;
    }

    interface Playlist {
      type: 'playlist';
      title: string;
      link: string;
      thumbnail: string;
      author: {
        name: string;
        ref: string;
        verified: boolean;
      };
      length: string;
    }

    interface Channel {
      type: 'channel';
      name: string;
      channel_id: string;
      link: string;
      avatar: string;
      verified: boolean;
      followers: number;
      description_short: string;
      videos: number;
    }

    interface Video {
      type: 'video';
      live: boolean;
      title: string;
      link: string;
      thumbnail: string;
      author: {
        name: string;
        ref: string;
        verified: boolean;
      };
      description: string | null;
      views: number | null;
      duration: string | null;
      uploaded_at: string | null;
    }

    interface Movie {
      type: 'movie';
      title: string;
      link: string;
      thumbnail: string;
      author: {
        name: string;
        ref: string;
        verified: boolean;
      };
      description: string | null;
      meta: string[];
      actors: string[];
      director: string | null;
      duration: string;
    }

    interface RelatedSearches {
      type: 'search-refinements';
      entrys: {
        link: string;
        q: string | null;
      }[];
    }

    interface ShelfCompact {
      type: 'shelf-compact';
      title: string;
      items: {
        type: string;
        name: string;
        ref: string;
        thumbnail: string;
        duration: string;
        price: string;
      }[];
    }

    interface ShelfVertical {
      type: 'shelf-vertical';
      title: string;
      items: Video[];
    }

    interface Filter {
      ref: string | null;
      name: string;
      active: boolean;
    }

    type Item = Mix | Playlist | Channel | Video | Movie | RelatedSearches | ShelfCompact | ShelfVertical;

    interface Result {
      query: string;
      items: Item[];
      nextpageRef: string | null;
      results: string;
      filters: Filter[];
      currentRef: string | null;
    }

    function getFilters(searchString: string, options?: ytsr.Options): Promise<Map<string, Filter[]>>;
  }

  function ytsr(id: string): Promise<ytsr.Result>;
  function ytsr(id: string | null, options: ytsr.Options): Promise<ytsr.Result>;

  export = ytsr;
}
