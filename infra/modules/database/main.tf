resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, { Name = "${var.project}-db-subnet-group" })
}

resource "aws_security_group" "rds" {
  name        = "${var.project}-rds-sg"
  description = "Postgres - access only from ECS tasks"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-rds-sg" })
}

# snapshot_identifier: empty string means "fresh empty DB" (the normal case);
# set via -var=restore_from_snapshot=<id> to restore instead. See
# infra/scripts/restore.sh and backend-spec.md §9 Backup & Restore.
resource "aws_db_instance" "this" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage = var.allocated_storage_gb
  storage_type      = "gp3"

  db_name  = var.restore_from_snapshot == "" ? var.db_name : null
  username = var.restore_from_snapshot == "" ? var.master_username : null
  password = var.restore_from_snapshot == "" ? var.master_password : null

  snapshot_identifier = var.restore_from_snapshot != "" ? var.restore_from_snapshot : null

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period = var.backup_retention_days
  # Snapshots are taken manually (infra/scripts/backup.sh) before every
  # destroy — a static final_snapshot_identifier can't survive a repeated
  # destroy/apply cycle, so it's disabled here in favor of that script.
  skip_final_snapshot = true

  apply_immediately = true

  tags = merge(var.tags, { Name = "${var.project}-db" })

  lifecycle {
    ignore_changes = [snapshot_identifier]
  }
}
