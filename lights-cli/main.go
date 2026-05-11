package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	"github.com/spf13/cobra"
)

var serverURL string

// get performs a GET to the given API path and prints the response.
func get(path string) {
	resp, err := http.Get(serverURL + path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error connecting to server: %v\n", err)
		os.Exit(1)
	}
	handleResponse(resp)
}

// post performs a POST (no body) to the given API path and prints the response.
func post(path string) {
	resp, err := http.Post(serverURL+path, "application/json", nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error connecting to server: %v\n", err)
		os.Exit(1)
	}
	handleResponse(resp)
}

func handleResponse(resp *http.Response) {
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result map[string]any
	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing response: %v\n", err)
		os.Exit(1)
	}

	accepted, _ := result["accepted"].(bool)
	if accepted {
		if response, ok := result["response"]; ok && response != nil {
			pretty, _ := json.MarshalIndent(response, "", "  ")
			fmt.Println(string(pretty))
		}
		fmt.Println("Complete")
	} else {
		msg, _ := result["message"].(string)
		if msg == "" {
			msg = "Unknown error"
		}
		fmt.Fprintf(os.Stderr, "There was a problem: %s\n", msg)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "lights",
	Short: "Control the LED light strips",
}

var onCmd = &cobra.Command{
	Use:   "on",
	Short: "Turn the lights on",
	Run:   func(cmd *cobra.Command, args []string) { post("/api/actions/on") },
}

var offCmd = &cobra.Command{
	Use:   "off",
	Short: "Turn the lights off",
	Run:   func(cmd *cobra.Command, args []string) { post("/api/actions/off") },
}

var nextCmd = &cobra.Command{
	Use:   "next",
	Short: "Advance to the next algorithm in the cycle",
	Run:   func(cmd *cobra.Command, args []string) { post("/api/actions/next") },
}

var brightnessCmd = &cobra.Command{
	Use:   "brightness <0.0-1.0>",
	Short: "Set the brightness (0.0 to 1.0)",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		val, err := strconv.ParseFloat(args[0], 64)
		if err != nil || val < 0.0 || val > 1.0 {
			fmt.Fprintln(os.Stderr, "brightness must be a number between 0.0 and 1.0")
			os.Exit(1)
		}
		post("/api/actions/set_brightness/" + args[0])
	},
}

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Get current status",
	Run:   func(cmd *cobra.Command, args []string) { get("/api/actions/get_status") },
}

var cyclesCmd = &cobra.Command{
	Use:   "cycles",
	Short: "List available cycles",
	Run:   func(cmd *cobra.Command, args []string) { get("/api/actions/get_cycles") },
}

var setCycleCmd = &cobra.Command{
	Use:   "set-cycle <name>",
	Short: "Switch to a named cycle",
	Args:  cobra.ExactArgs(1),
	Run:   func(cmd *cobra.Command, args []string) { post("/api/actions/set_cycle/" + args[0]) },
}

var stripsCmd = &cobra.Command{
	Use:   "strips",
	Short: "List connected light strips",
	Run:   func(cmd *cobra.Command, args []string) { get("/api/strips") },
}

func init() {
	rootCmd.PersistentFlags().StringVar(&serverURL, "server", "http://localhost:8080", "Home server URL")
	rootCmd.AddCommand(onCmd, offCmd, nextCmd, brightnessCmd, statusCmd, cyclesCmd, setCycleCmd, stripsCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
