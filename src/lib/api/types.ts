export interface UserItemDataDto {
	PlaybackPositionTicks: number;
	PlayCount: number;
	IsFavorite: boolean;
	Played: boolean;
	UnplayedItemCount?: number;
}

export interface ImageTags {
	Primary?: string;
	Backdrop?: string;
	Thumb?: string;
}

export interface MediaStream {
	Type: 'Video' | 'Audio' | 'Subtitle';
	Codec: string;
	DisplayTitle?: string;
	Index: number;
	IsDefault: boolean;
	Language?: string;
}

export interface MediaSourceInfo {
	Id: string;
	Name: string;
	Path?: string;
	Container: string;
	Size?: number;
	SupportsDirectPlay: boolean;
	SupportsDirectStream: boolean;
	SupportsTranscoding: boolean;
	RunTimeTicks?: number;
	MediaStreams?: MediaStream[];
}

export interface BaseItemDto {
	Id: string;
	Name: string;
	Type: string;
	IsFolder: boolean;
	ParentId?: string;
	UserData?: UserItemDataDto;
	ImageTags?: ImageTags;
	BackdropImageTags?: string[];
	ChildCount?: number;
	RecursiveItemCount?: number;
	RunTimeTicks?: number;
	Overview?: string;
	DateCreated?: string;
	Path?: string;
	CollectionType?: string;
	SeriesName?: string;
	SeasonName?: string;
	IndexNumber?: number;
	ParentIndexNumber?: number;
	MediaSources?: MediaSourceInfo[];
	Container?: string;
	MediaType?: string;
}

export interface ItemsResponse {
	Items: BaseItemDto[];
	TotalRecordCount: number;
}

export interface AuthenticationResult {
	AccessToken: string;
	User: {
		Id: string;
		Name: string;
		ServerId: string;
	};
}

export interface SessionInfo {
	serverUrl: string;
	token: string;
	userId: string;
	username: string;
}

export interface PlaybackInfoResponse {
	MediaSources: MediaSourceInfo[];
	PlaySessionId: string;
}

export interface PlaybackStartReport {
	ItemId: string;
	MediaSourceId: string;
	PlaySessionId: string;
	CanSeek: boolean;
	PlayMethod: 'DirectPlay' | 'DirectStream' | 'Transcode';
	PositionTicks?: number;
}

export interface PlaybackProgressReport extends PlaybackStartReport {
	IsPaused: boolean;
	PositionTicks: number;
}

export interface PlaybackStopReport {
	ItemId: string;
	MediaSourceId: string;
	PlaySessionId: string;
	PositionTicks: number;
}
