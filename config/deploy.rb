require "capistrano/node-deploy"
require 'codebase/recipes'

set :stages, %w(production staging)
set :default_stage, "staging"
require 'capistrano/ext/multistage'

set :application, "chat-api"
#set :repository,  "git@codebasehq.com:love/is-typing/chat-api.git"

set :scm, :none
set :repository, "."
set :deploy_via, :copy

#set :scm, :git 

set :user, "jeroen"
set :use_sudo, true

set :deploy_to, "/opt/chat-api"

ssh_options[:forward_agent] = true

default_run_options[:pty] = true

namespace :deploy do
  task :start do 
  	sudo 'start chat-api'
  end
  task :stop do 
  	sudo 'stop chat-api'
  end
end

namespace :node do
	task :restart do
		deploy.stop
		deploy.start
	end

  task :check_upstart_config do
  end

  task :create_upstart_config do
  end
end

