package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"

	"github.com/go-zeromq/zmq4"
	"github.com/spf13/cobra"
)

const zmqAddr = "tcp://localhost:5555"

func sendCommand(command string, extra map[string]any) {
	sock := zmq4.NewReq(context.Background())
	defer sock.Close()

	if err := sock.Dial(zmqAddr); err != nil {
		fmt.Fprintf(os.Stderr, "Error connecting to light controller: %v\n", err)
		os.Exit(1)
	}

	payload := map[string]any{"command": command}
	for k, v := range extra {
		payload[k] = v
	}

	data, _ := json.Marshal(payload)
	if err := sock.Send(zmq4.NewMsg(data)); err != nil {
		fmt.Fprintf(os.Stderr, "Error sending command: %v\n", err)
		os.Exit(1)
	}

	msg, err := sock.Recv()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error receiving response: %v\n", err)
		os.Exit(1)
	}

	var response map[string]any
	if err := json.Unmarshal(msg.Frames[0], &response); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing response: %v\n", err)
		os.Exit(1)
	}

	accepted, _ := response["accepted"].(bool)
	if accepted {
		if resp, ok := response["response"]; ok && resp != nil {
			pretty, _ := json.MarshalIndent(resp, "", "  ")
			fmt.Println(string(pretty))
		}
		fmt.Println("Complete")
	} else {
		msg, _ := response["message"].(string)
		if msg == "" {
			msg = "Unknown Error"
		}
		fmt.Fprintf(os.Stderr, "There was a problem: %s\n", msg)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "lights",
	Short: "Control the LED light strip",
}

var onCmd = &cobra.Command{
	Use:   "on",
	Short: "Turn the lights on",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Doing ON")
		sendCommand("on", nil)
	},
}

var offCmd = &cobra.Command{
	Use:   "off",
	Short: "Turn the lights off",
	Run: func(cmd *cobra.Command, args []string) {
		sendCommand("off", nil)
	},
}

var nextCmd = &cobra.Command{
	Use:   "next",
	Short: "Advance to the next algorithm in the cycle",
	Run: func(cmd *cobra.Command, args []string) {
		sendCommand("next", nil)
	},
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
		sendCommand("set_brightness", map[string]any{"brightness": val})
	},
}

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Get current light controller status",
	Run: func(cmd *cobra.Command, args []string) {
		sendCommand("get_status", nil)
	},
}

var cyclesCmd = &cobra.Command{
	Use:   "cycles",
	Short: "List available cycles",
	Run: func(cmd *cobra.Command, args []string) {
		sendCommand("get_cycles", nil)
	},
}

var setCycleCmd = &cobra.Command{
	Use:   "set-cycle <name>",
	Short: "Switch to a named cycle",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		sendCommand("set_cycle", map[string]any{"name": args[0]})
	},
}

func init() {
	rootCmd.AddCommand(onCmd, offCmd, nextCmd, brightnessCmd, statusCmd, cyclesCmd, setCycleCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
