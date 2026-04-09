package com.hhst.youtubelite.extractor;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

public record AuthContext(
				@NonNull String context,
				@Nullable String cookies,
				@Nullable String visitorData,
				@Nullable String dataSyncId,
				@Nullable String clientVersion,
				@Nullable String sessionIndex,
				boolean loggedIn,
				boolean premium,
				long createdAtMs) {
}
