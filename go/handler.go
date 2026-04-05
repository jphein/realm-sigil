package sigil

import (
	"encoding/json"
	"net/http"
)

// Handler returns an http.HandlerFunc that serves the /api/version JSON response.
// Uptime is computed fresh on each request.
func Handler(name, description, realm, repo string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		v := NewVersion(name, description, realm, repo)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		json.NewEncoder(w).Encode(v)
	}
}
