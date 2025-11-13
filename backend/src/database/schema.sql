-- Database schema for Notes Email Application

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    gmail_refresh_token TEXT, -- For OAuth send-as-user functionality
    gmail_access_token TEXT,
    gmail_token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- Markdown content
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email templates table with versioning
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL, -- Handlebars template
    variables JSONB DEFAULT '[]', -- Array of variable names for hints
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email template versions (for tracking what version was used in sent emails)
CREATE TABLE email_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, version)
);

-- Sent emails table for idempotency and tracking
CREATE TABLE sent_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    template_version INTEGER NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL, -- For preventing duplicate sends
    recipients TEXT[] NOT NULL, -- Array of email addresses
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    provider_message_id VARCHAR(255), -- ID from email provider
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX idx_email_templates_active ON email_templates(user_id, is_active);
CREATE INDEX idx_sent_emails_user_id ON sent_emails(user_id);
CREATE INDEX idx_sent_emails_idempotency ON sent_emails(idempotency_key);
CREATE INDEX idx_sent_emails_status ON sent_emails(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sent_emails_updated_at BEFORE UPDATE ON sent_emails FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create template version when template is updated
CREATE OR REPLACE FUNCTION create_template_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the old version into template_versions
    IF TG_OP = 'UPDATE' AND (OLD.subject != NEW.subject OR OLD.body != NEW.body OR OLD.variables != NEW.variables) THEN
        INSERT INTO email_template_versions (template_id, version, subject, body, variables, created_at)
        VALUES (OLD.id, OLD.version, OLD.subject, OLD.body, OLD.variables, OLD.updated_at);
        
        -- Increment version for the updated template
        NEW.version = OLD.version + 1;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_template_version_trigger 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION create_template_version();

-- Insert demo user
INSERT INTO users (email, password_hash, name) VALUES 
('demo@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo User');
-- Password is 'password' hashed with bcrypt
