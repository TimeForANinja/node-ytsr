declare module 'ytsr' {
  namespace ytsr {
    // General
    interface Options extends ShortOptions {
      /** Limits the pulled items. */
      limit?: number;
      /** Limits the pulled pages - overwrites limit. */
      pages?: number;
      safeSearch?: boolean;
    }

    interface ShortOptions {
      /** Location setting */
      gl?: string;
      hl?: string;
      /** Request Options for Miniget */
      requestOptions?: { [key: string]: object; } & { headers?: { [key: string]: string; } };
    }

    interface ContinueResult {
      continuation: Continuation | null;
      items: Item[];
    }

    interface Continuation {}

    interface Filter {
      url: string | null;
      name: string;
      description: string;
      active: boolean;
    }

    interface Result {
      originalQuery: string;
      correctedQuery: string;
      results: number;
      activeFilters: Filter[];
      refinements: Refinement[];
      items: Item[];
      continuation: Continuation | null;
    }

    // Subtypes
    interface VideoSmall {
    // Generalization for Mix and Playlist
      id: string;
      shortURL: string;
      url: string;
      title: string;
      length: string;
      thumbnails: Image[];
      bestThumbnail: Image;
    }

    interface Image {
      url: string | null;
      width: number;
      height: number;
    }

    interface Refinement {
      q: string;
      url: string;
      // Only provided for HorizontalCardListRenderer
      thumbnails: string[] | null;
      bestThumbnail: string | null;
    }

    // Response Items
    interface Video {
      type: 'video';
      title: string;
      id: string;
      url: string;
      bestThumbnail: Image;
      thumbnails: Image[];
      isUpcoming: boolean;
      upcoming: number | null;
      isLive: boolean;
      badges: string[];

      author: {
        name: string;
        channelID: string;
        url: string;
        bestAvatar: Image | null;
        avatars: Image[];
        ownerBadges: string[];
        verified: boolean;
      } | null;
      description: string | null;
      views: number | null;
      duration: string | null;
      uploadedAt: string | null;
    }

    interface Short {
      type: 'short';
      title: string;
      id: string;
      url: string;
      bestThumbnail: Image;
      thumbnails: Image[];
      views: string;
      published: string | null;

      channel: {
        name: string;
        channelID: string;
        url: string;
        bestAvatar: Image | null;
        avatars: Image[];
      } | null;
    }

    interface Channel {
      type: 'channel';
      name: string;
      channelID: string;
      url: string;
      bestAvatar: Image;
      avatars: Image[];
      verified: boolean;
      subscribers: string | null;
      descriptionShort: string | null;
      videos: number | null;
    }

    interface Playlist {
      type: 'playlist';
      title: string;
      playlistID: string;
      url: string;
      firstVideo: VideoSmall | null;
      owner: {
        name: string;
        channelID: string;
        url: string;
        ownerBadges: string[];
        verified: boolean;
      } | null;
      publishedAt: string | null;
      length: number;
    }

    interface Mix {
      type: 'mix';
      title: string;
      url: string;
      firstVideo: VideoSmall;
    }

    interface GridMovie {
      type: 'gridMovie';
      title: string;
      videoID: string;
      url: string;
      thumbnails: Image[];
      bestThumbnail: Image;
      duration: string;
    }

    interface Movie {
      type: 'movie';
      title: string;
      videoID: string;
      url: string;
      bestThumbnail: Image;
      thumbnails: Image[];
      author: {
        name: string;
        channelID: string;
        url: string;
        ownerBadges: string[];
        verified: boolean;
      };
      description: string | null;
      meta: string[];
      actors: string[];
      directors: string[];
      duration: string;
    }

    interface Show {
      type: 'show';
      title: string;
      thumbnails: Image[];
      bestThumbnail: Image;
      url: string;
      videoID: string;
      playlistID: string;
      episodes: number;
      owner: {
        // No owner badges in here :shrug:
        name: string;
        channelID: string;
        url: string;
      };
    }

    interface Shelf {
      type: 'shelf';
      title: string;
      items: Item[];
    }

    interface Clarification {
      type: 'clarification';
      title: string;
      text: string;
      sources: {
        text: string;
        url: string;
      }[];
    }

    interface HorizontalChannelList {
      type: 'horizontalChannelList';
      title: string;
      // ATM only subtype channel supported
      channels: {
        type: 'channelPreview';
        name: string;
        channelID: string;
        url: string;
        bestAvatar: Image;
        avatars: Image[];
        subscribers: string;
        videos: Video[];
      }[];
    }

    type Item = Video | Channel | Short | Playlist | Mix | GridMovie | Movie | Show | Shelf | Clarification | HorizontalChannelList;

    /**
     * @param searchString search query or link from a previous getFilters request
     * @param options Optional additional Options
     * @description Fetches the links of all available filters
     */
    function getFilters(searchString: string, options?: ytsr.ShortOptions): Promise<Map<string, Map<string, Filter>>>;

    /**
     * @param continuationData Data provided from a previous request
     * @description fetches one additional page & parses its items - only supported when using pages
     */
    function continueReq(continuationData: Continuation): Promise<ContinueResult>;

    const version: string;
  }

  /**
   * @param query search query or link from a previous getFilters request
   * @param options Optional additional Options
   * @description Searches youtube for the query
   */
  function ytsr(query: string, options?: ytsr.Options): Promise<ytsr.Result>;

  export = ytsr;
}
