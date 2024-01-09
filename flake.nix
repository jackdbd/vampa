{
  description = "Monorepo for my Cloudflare Pages Functions plugins & Hono plugins";

  inputs = {
    # nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0.1.*.tar.gz";
    # nixpkgs.url = "github:nixos/nixpkgs/nixos-23.11";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    alejandra = {
      url = "github:kamadorueda/alejandra/3.0.0";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    nil.url = "github:oxalica/nil";
  };

  outputs = {
    nixpkgs,
    self,
    ...
  } @ inputs: let
    overlays = [
      (final: prev: {
        nodejs = prev.nodejs_20;
      })
    ];
    supportedSystems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
    forEachSupportedSystem = f:
      nixpkgs.lib.genAttrs supportedSystems (system:
        f {
          pkgs = import nixpkgs {inherit overlays system;};
        });
  in {
    devShells = forEachSupportedSystem ({pkgs}: {
      default = pkgs.mkShell {
        nativeBuildInputs = [];
        buildInputs = [];
        packages = with pkgs; [
          node2nix
          nodejs
          zx
          nodePackages.prettier
          nodePackages.wrangler
        ];
        shellHook = ''
          echo "🌐 personal website dev shell"
          echo "- Node.js $(node --version)"
          echo "- npm $(npm --version)"
          echo "- prettier $(prettier --version)"
          echo "- wrangler $(wrangler --version)"
          echo "- zx $(zx --version)"
          export TELEGRAM=$(cat /run/secrets/telegram/personal_bot);
        '';

        # DEBUG = "*";
        # NODE_DEBUG = "*";
        # ALWAYS set NODE_ENV to production
        # https://youtu.be/HMM7GJC5E2o?si=RaVgw65WMOXDpHT2
        NODE_ENV = "production";
      };
    });
  };
}
