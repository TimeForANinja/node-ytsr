declare module 'ytsr' {
  namespace ytsr {
    interface Options {
      searchString?: string;
      safeSearch?: boolean;
      limit?: number;
      nextpageRef?: string;
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
      description: string;
      views: number;
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
      description: string;
      meta: string[];
      actors: string[];
      director: string;
      duration: string;
    }

    interface RelatedSearches {
      type: 'search-refinements';
      entrys: any;
    }

    interface ShelfCompact {
      type: 'shelf-compact';
      title: string;
      items: any;
    }

    interface ShelfVertical {
      type: 'shelf-vertical';
      title: string;
      items: any;
    }

    type Item = Playlist | Channel | Video | Movie | RelatedSearches | ShelfCompact | ShelfVertical;

    interface Result {
      query: string;
      items: Item[];
      nextpageRef: string;
      results: string;
      filters: {
        ref?: string;
        name: string;
        active: boolean;
      }[];
      currentRef?: string;
    }

    function getFilters(searchString: string, callback?: Function): Promise<Map<string, any>>

  }

  function ytsr(id: string, callback: (err: Error, result: ytsr.Result) => any): void;
  function ytsr(id: string | null, options: ytsr.Options, callback: (err: Error, result: ytsr.Result) => any): void;
  function ytsr(id: string): Promise<ytsr.Result>;
  function ytsr(id: string | null, options: ytsr.Options): Promise<ytsr.Result>;

  // Helper property to suppress deprecation warnings
  let do_warn_deprecate: boolean;

  export = ytsr;
}
