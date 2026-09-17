# ProGuard/R8 rules for the PTKOMIKCAFFE Android wrapper.
# Shrinking is disabled (minifyEnabled false), so this file intentionally keeps
# the WebView entry points that R8 would otherwise have to rule-keep.
-keep class com.sibangku.ptkomikcaffe.MainActivity { *; }
